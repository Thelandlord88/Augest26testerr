import fs from 'node:fs';
import path from 'node:path';

const OUT_DIR = 'public/tiles';
fs.mkdirSync(OUT_DIR, { recursive: true });

// Placeholder for vector tile build step.
// Integrate real tile generation here using your suburb GeoJSON.
console.log('[build-tiles] placeholder - no tiles generated');
