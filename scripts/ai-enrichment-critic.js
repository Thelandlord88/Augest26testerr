#!/usr/bin/env node
import 'dotenv/config';
import { chromium } from 'playwright';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createSarif, rule, result, writeSarif } from './sarif.js';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const OUT_SARIF = process.env.AI_SARIF_ENRICH || 'sarif/ai-enrichment.sarif';
const OUT_MD_DIR = 'ai-reports';
const ORIGIN = process.env.SITE_ORIGIN || 'http://localhost:4322';
const ROUTES = (process.env.SCAN_ROUTES || '/services/spring-cleaning/,/services/bathroom-clean/').split(/\s*,\s*/).filter(Boolean);

function extractJson(s) {
  const m = s?.match(/\{[\s\S]*\}$/m) || s?.match(/\[[\s\S]*\]$/m);
  return m ? m[0] : s;
}

async function callOpenAI(payload) {
  if (!OPENAI_API_KEY) return null;
  const { default: OpenAI } = await import('openai');
  const client = new OpenAI({ apiKey: OPENAI_API_KEY });
  const resp = await client.chat.completions.create({
    model: MODEL,
    temperature: 0.3,
    messages: payload
  });
  return resp.choices?.[0]?.message?.content?.trim() || '';
}

async function analyze(page, route) {
  const url = ORIGIN.replace(/\/$/, '') + route;
  await page.goto(url, { waitUntil: 'domcontentloaded' }).catch(() => {});
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
  try { await page.addStyleTag({ content: `*{animation:none!important;transition:none!important;}` }); } catch {}

  const dom = await page.evaluate(() => {
    try {
      const textNodes = document.body.innerText.replace(/\s+/g,' ').trim();
      const h1 = document.querySelector('h1')?.textContent?.trim() || '';
      const ctas = [...document.querySelectorAll('a,button')].filter(n => /quote|book|call/i.test(n.textContent||''))
        .map(n => (n.textContent||'').trim()).slice(0,10);
      const imgs = [...document.images].map(i => i.src);
      const headings = [...document.querySelectorAll('h2,h3')].map(n => n.textContent?.trim());
      const faqs = [...document.querySelectorAll('details summary,[data-accordion-trigger]')].map(n => n.textContent?.trim());
      const links = [...document.querySelectorAll('a[href^="/"]')].map(a => a.getAttribute('href'));
      const schema = [...document.querySelectorAll('script[type="application/ld+json"]')].map(s => s.textContent || '');
      return { h1, textNodes, ctas, imgs, headings, faqs, links, schema };
    } catch {
      return { h1: '', textNodes: '', ctas: [], imgs: [], headings: [], faqs: [], links: [], schema: [] };
    }
  });

  const wc = dom.textNodes.split(' ').length;
  const metrics = {
    url: route, h1: dom.h1, wordCount: wc,
    imageCount: dom.imgs.length,
    ctaCount: dom.ctas.length,
    faqCount: dom.faqs.length,
    internalLinks: dom.links.length,
    hasSchema: dom.schema.some(s => /LocalBusiness|Service/i.test(s))
  };

  const plain = (wc < 250) || (dom.imgs.length < 2) || (dom.ctas.length < 1) || !metrics.hasSchema;

  return { metrics, dom };
}

async function run() {
  const rules = [
    rule({ id: 'enrich.plain', name: 'Thin or plain page' }),
    rule({ id: 'enrich.missing', name: 'Missing key components' })
  ];
  const results = [];

  const browser = await chromium.launch();
  const page = await browser.newPage();

  for (const route of ROUTES) {
    let metrics = { url: route, h1: '', wordCount: 0, imageCount: 0, ctaCount: 0, faqCount: 0, internalLinks: 0, hasSchema: false };
    let dom = { headings: [], ctas: [] };
    try {
      const res = await analyze(page, route);
      metrics = res.metrics; dom = res.dom;
    } catch (e) {
      results.push(result({ ruleId: 'enrich.missing', level: 'note', message: `Navigation error on ${route}: ${e?.message || e}`, file: `route:${route}`, startLine:1, startColumn:1 }));
    }

    if (metrics.wordCount < 250) results.push(result({ ruleId: 'enrich.plain', level: 'warning', message: `Low copy depth (${metrics.wordCount} words). Target 500–800 words for service pages.`, file: `route:${metrics.url}`, startLine:1, startColumn:1 }));
    if (metrics.ctaCount < 1) results.push(result({ ruleId: 'enrich.missing', level: 'error', message: `No prominent CTA detected (e.g., “Get a Quote”).`, file:`route:${metrics.url}`, startLine:1, startColumn:1 }));
    if (!metrics.hasSchema) results.push(result({ ruleId:'enrich.missing', level:'warning', message:`No LocalBusiness/Service JSON-LD found.`, file:`route:${metrics.url}`, startLine:1, startColumn:1 }));
    if (metrics.faqCount < 3) results.push(result({ ruleId:'enrich.missing', level:'note', message:`Few FAQs (${metrics.faqCount}). Add 3–5 spring-clean specific FAQs.`, file:`route:${metrics.url}`, startLine:1, startColumn:1 }));

    let report = '';
    if (OPENAI_API_KEY) {
      const payload = [
        { role: 'system', content: 'You are a senior marketing/web engineer for an Australian cleaning business. Output STRICT JSON; no code fences.' },
        { role: 'user', content:
`Page metrics:
${JSON.stringify(metrics, null, 2)}

Headings: ${dom.headings.join(' | ')}
Example CTAs: ${dom.ctas.join(' | ')}

TASK:
Return JSON:
{
  "priority_actions": [ {"title": "...", "why": "...", "impact": "high|med|low"} ],
  "missing_components": ["hero proof bar", "before/after gallery", "service inclusions grid", "local suburbs chips", "testimonial slider", "FAQ (spring-specific)", "sticky quote CTA", "Service JSON-LD"],
  "ready_blocks": [
    {"id":"hero_sub","markdown":"..."},
    {"id":"inclusions","markdown":"- Bathrooms: ...\n- Kitchen: ..."},
    {"id":"cta_panel","markdown":"**Get a Quote** — Fixed-price spring clean in Ipswich. Police-checked, insured, 7-day re-clean."},
    {"id":"meta","title":"Spring Cleaning Ipswich & Brisbane | One N Done","description":"Top-to-bottom spring cleaning — kitchens, bathrooms, fans & tracks. Police-checked, insured, 7-day re-clean. Get a fast quote today."},
    {"id":"faqs_spring","markdown":"Q: What’s included in a spring clean?\nA: ...\n\nQ: How long does it take?\nA: ...\n\nQ: Do you bring supplies?\nA: ..."}
  ]
}

Rules:
- Use Australian English and your brand tone (professional, friendly, trustworthy).
- Focus on *spring cleaning* (DO NOT mention bond/end-of-lease).
- Keep each markdown block small and paste-ready.` }
      ];
      report = await callOpenAI(payload);
    }

    await fs.mkdir(OUT_MD_DIR, { recursive: true });
    const mdPath = path.join(OUT_MD_DIR, `${metrics.url.replace(/[\/]+/g,'_').replace(/^_/, '')}_enrichment.json`);
    await fs.writeFile(mdPath, extractJson(report || '{}'), 'utf8');

    results.push(result({
      ruleId: 'enrich.plain',
      level: 'note',
      message: `Enrichment plan saved to ${mdPath}`,
      file: `route:${metrics.url}`, startLine: 1, startColumn: 1
    }));
  }

  await browser.close().catch(() => {});
  await fs.mkdir(path.dirname(OUT_SARIF), { recursive: true });
  await writeSarif(OUT_SARIF, createSarif({ toolName: 'AI Enrichment Critic', rules, results }));
  console.log(`[ai-enrichment] Wrote ${results.length} findings to ${OUT_SARIF}`);
}

run().catch(e => { console.error('[ai-enrichment] Unexpected error:', e); /* do not hard fail */ });
