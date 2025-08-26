#!/usr/bin/env node
import { chromium } from 'playwright';
import fs from 'fs';

const ORIGIN = process.env.SITE_ORIGIN || 'http://localhost:4322';
const ROUTES = (process.env.SCAN_ROUTES || '/, /services/bond-cleaning/, /services/spring-cleaning/, /services/bathroom-deep-clean/').split(/\s*,\s*/);

const must = [/ipswich|brisbane|logan/i];
const forbid = [/bond\s?clean/i];

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();

const results = [];
for (const r of ROUTES) {
  const url = new URL(r, ORIGIN).toString();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    const h1 = await page.locator('h1').first().textContent();
    const title = await page.title();
    const body = (await page.locator('body').innerText()).slice(0, 5000);
    results.push({ url, h1, title, hasRegion: must.some(re => re.test(`${h1} ${title} ${body}`)), hasBond: forbid.some(re => re.test(body)) });
  } catch (e) {
    results.push({ url, error: String(e) });
  }
}
await browser.close();
fs.mkdirSync('/tmp', { recursive: true });
fs.writeFileSync('/tmp/audit.json', JSON.stringify({ origin: ORIGIN, results }, null, 2));
console.log('Wrote /tmp/audit.json with', results.length, 'entries');
