// scripts/guard-deno.js
// Purpose: If USE_EDGE=true, ensure Deno exists; otherwise fail fast with a clear message.
// Loads .env so the flag is respected before Astro boots.
try { await import('dotenv/config'); } catch {}
import { execSync } from 'node:child_process';

const useEdge = String(process.env.USE_EDGE || 'false').toLowerCase() === 'true';

if (useEdge) {
  try {
    execSync('deno --version', { stdio: 'ignore' });
  } catch {
    console.error('\n[Edge] USE_EDGE=true but Deno is not installed or not on PATH.');
    console.error('Install Deno (https://deno.land/#installation) or unset USE_EDGE.');
    process.exit(1);
  }
}
