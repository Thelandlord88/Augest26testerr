#!/usr/bin/env node
import { chromium } from 'playwright';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import micromatch from 'micromatch';
import { createSarif, rule, result, writeSarif } from './sarif.js';

// ---------- config ----------
const OUT = process.env.AI_SARIF_INTENT || 'sarif/ai-intent.sarif';
const ORIGIN = (process.env.SITE_ORIGIN || 'http://localhost:4322').replace(/\/+$/, '');
const ROUTES = (process.env.SCAN_ROUTES || '/, /services/bond-cleaning/, /services/spring-cleaning/, /services/bathroom-deep-clean/').split(/\s*,\s*/).filter(Boolean);
const NAV_TIMEOUT_MS = Number(process.env.AI_INTENT_TIMEOUT || 15000);

// optional ai-rules.json: { "routes":[{ "glob":"/services/bond-cleaning/**", "must":["bond","vacate"], "forbid":["spring"] }], "lexicon":{ "bond":["bond","end of lease","end-of-lease"] } }
let CONFIG = { routes: [], lexicon: {} };
try {
  CONFIG = JSON.parse(await fs.readFile('ai-rules.json', 'utf8'));
  if (!Array.isArray(CONFIG.routes)) CONFIG.routes = [];
  if (!CONFIG.lexicon || typeof CONFIG.lexicon !== 'object') CONFIG.lexicon = {};
} catch { /* optional file */ }

// ---------- utils ----------
const escapeRegExp = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function expandTerms(list, lex) {
  const out = [];
  for (const t of (list || [])) out.push(...(lex[t] || [t]));
  return [...new Set(out.map(String))];
}

function normalizeUrl(u) {
  try {
    const p = new URL(u, ORIGIN).pathname;
    return (p.endsWith('/') ? p : p + '/') || '/';
  } catch { return '/'; }
}

function urlIntent(url, h1, title) {
  const hay = `${url} ${h1 || ''} ${title || ''}`.toLowerCase();
  if (/\bspring[-\s]?clean(?:ing)?\b/.test(hay)) return 'spring-cleaning';
  if (/\bbath(?:room)?[-\s]?(?:deep|detail)[-\s]?clean(?:ing)?\b/.test(hay)) return 'bathroom-deep-clean';
  if (/\bbond[-\s]?clean(?:ing)?\b|\bend[-\s]?of[-\s]?lease\b/.test(hay)) return 'bond-cleaning';
  return 'generic';
}

function matchRoute(urlPath) {
  const matches = CONFIG.routes
    .filter(r => r && typeof r === 'object' && typeof r.glob === 'string')
    .filter(r => micromatch.isMatch(urlPath, r.glob));

  const must = expandTerms(matches.flatMap(m => m.must || []), CONFIG.lexicon || {});
  const forbid = expandTerms(matches.flatMap(m => m.forbid || []), CONFIG.lexicon || {});
  return { must, forbid };
}

// count hits for a list of terms in a big lowercased text blob
function termHits(txt, terms) {
  return terms.map(t => {
    // word-boundary around the whole phrase; allow hyphen/space variability inside via lexicon authoring
    const re = new RegExp(`\\b${escapeRegExp(t)}\\b`, 'gi');
    const count = (txt.match(re) || []).length;
    return { term: t, count };
  }).filter(x => x.count > 0);
}

// ---------- page analyzer ----------
async function analyzeRoute(page, route) {
  const url = ORIGIN + (route.startsWith('/') ? route : `/${route}`);
  await page.goto(url, { waitUntil: 'networkidle', timeout: NAV_TIMEOUT_MS });
  await page.waitForSelector('body', { timeout: 5000 }).catch(() => {});

  // disable animations for deterministic text capture
  await page.addStyleTag({ content: `*{animation:none!important;transition:none!important;}` });

  const data = await page.evaluate(() => {
    const selText = (q) => document.querySelector(q)?.textContent?.trim() || '';
    const H1 = selText('h1');
    const title = document.title || '';
    const headings = [...document.querySelectorAll('h2,h3,summary,[role="button"]')].map(n => n.textContent?.trim() || '');
    const bodyText = (document.body?.innerText || '').replace(/\s+/g,' ').trim();
    return { H1, title, headings, bodyText };
  });

  const urlPath = normalizeUrl(url);
  const intent = urlIntent(urlPath, data.H1, data.title);
  const { must, forbid } = matchRoute(urlPath);

  const txt = (data.bodyText || '').toLowerCase();

  const missing = must.filter(t => !new RegExp(`\\b${escapeRegExp(t)}\\b`, 'i').test(txt));
  const forbidHits = termHits(txt, forbid);

  const meta = { url: urlPath, h1: data.H1, title: data.title, intent };
  return { meta, must, forbid, missing, forbidHits, headings: data.headings.slice(0, 20) };
}

// ---------- main ----------
async function run() {
  const rules = [
    rule({ id: 'intent.missing',   name: 'Required terms missing',   shortDescription: 'Expected term not found on page' }),
    rule({ id: 'intent.forbidden', name: 'Forbidden terms present',  shortDescription: 'Forbidden term appears on page' }),
    rule({ id: 'intent.mismatch',  name: 'Page intent mismatch',     shortDescription: 'URL/H1 intent conflicts with body copy' }),
    rule({ id: 'intent.error',     name: 'Route analysis error',     shortDescription: 'Failed to analyze the route' }),
  ];
  const results = [];

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    for (const route of ROUTES) {
      try {
        const a = await analyzeRoute(page, route);

        for (const t of a.missing) {
          results.push(result({
            ruleId: 'intent.missing',
            level: 'warning',
            message: `Missing expected term "${t}" for ${a.meta.intent} page`,
            file: `route:${a.meta.url}`, startLine: 1, startColumn: 1,
            properties: { h1: a.meta.h1, title: a.meta.title, must: a.must }
          }));
        }

        for (const h of a.forbidHits) {
          results.push(result({
            ruleId: 'intent.forbidden',
            level: 'error',
            message: `Forbidden term "${h.term}" appears ${h.count}× on ${a.meta.url}`,
            file: `route:${a.meta.url}`, startLine: 1, startColumn: 1,
            properties: { h1: a.meta.h1, title: a.meta.title, forbid: a.forbid }
          }));
        }

        // simple opinionated mismatch: spring pages shouldn’t talk “bond”
        if (a.meta.intent === 'spring-cleaning' && a.forbidHits.some(h => /bond/i.test(h.term))) {
          results.push(result({
            ruleId: 'intent.mismatch',
            level: 'error',
            message: `H1/URL suggest “Spring Cleaning” but page contains bond-cleaning language. Replace FAQ/copy with Spring content.`,
            file: `route:${a.meta.url}`, startLine: 1, startColumn: 1,
            properties: { h1: a.meta.h1, title: a.meta.title }
          }));
        }
      } catch (e) {
        results.push(result({
          ruleId: 'intent.error',
          level: 'warning',
          message: `Failed to analyze ${route}: ${e?.message || e}`,
          file: `route:${route}`, startLine: 1, startColumn: 1
        }));
      }
    }
  } finally {
    await browser.close();
  }

  await fs.mkdir(path.dirname(OUT), { recursive: true });
  await writeSarif(OUT, createSarif({ toolName: 'AI Intent Linter', rules, results }));
  console.log(`[ai-intent] Wrote ${results.length} finding(s) to ${OUT}`);
}

run().catch(e => { console.error(e); process.exit(1); });
