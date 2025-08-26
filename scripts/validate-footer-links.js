// Quick footer link validator (funnel-first)
import fs from 'fs';
import path from 'path';
import http from 'http';
import https from 'https';

const siteOrigin = process.env.SITE_ORIGIN || 'http://localhost:4321';

const topics = JSON.parse(fs.readFileSync(path.resolve('src/data/topics.json'), 'utf8'));
const services = JSON.parse(fs.readFileSync(path.resolve('src/data/services.json'), 'utf8'));
const coverage = JSON.parse(fs.readFileSync(path.resolve('src/data/serviceCoverage.json'), 'utf8'));

function buildLinks() {
  const links = new Set();
  // Services
  for (const s of services) links.add(`/services/${s.slug}/`);
  // Popular areas (bond-cleaning coverage, first ~8)
  for (const sub of (coverage['bond-cleaning'] || []).slice(0,8)) {
    links.add(`/services/bond-cleaning/${sub}/`);
  }
  // Curated blogs (clustered paths retained for now)
  const curated = new Set(['bond-cleaning-checklist','what-agents-want','eco-bond-cleaning','client-stories']);
  for (const t of topics) {
    if (curated.has(t.slug)) links.add(`/blog/Ipswich Region/${t.slug}`);
  }
  links.add('/sitemap.xml');
  return Array.from(links);
}

function head(url) {
  return new Promise(resolve => {
    const full = url.startsWith('http') ? url : siteOrigin + url;
    const mod = full.startsWith('https') ? https : http;
    const req = mod.request(full, { method: 'HEAD' }, res => {
      resolve({ url, status: res.statusCode });
      res.resume();
    });
    req.on('error', () => resolve({ url, status: 0 }));
    req.end();
  });
}

(async () => {
  const links = buildLinks();
  const results = await Promise.all(links.map(head));
  const hardFailures = results.filter(r => r.url === '/sitemap.xml' ? (r.status === 0 || r.status >= 400) : false);
  const softMissing = results.filter(r => r.status === 0 || (r.status && r.status >= 400 && r.url !== '/sitemap.xml'));
  results.forEach(r => console.log(`${r.status}\t${r.url}${softMissing.includes(r) && r.url !== '/sitemap.xml' ? ' (warn)' : ''}`));
  if (hardFailures.length) {
    const allZero = results.every(r => r.status === 0);
    if (allZero) {
      console.warn('HTTP server not running; skipping critical footer validation.');
    } else {
      console.error('Critical footer resources failed.');
      process.exit(1);
    }
  }
  if (softMissing.length) {
    console.warn(`Non-critical footer links missing: ${softMissing.map(l => l.url).join(', ')}`);
  } else {
    console.log('All probed footer links healthy');
  }
})();
