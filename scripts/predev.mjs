#!/usr/bin/env node
// Fast, non-fatal sanity checks for local dev.
import { execSync } from 'node:child_process';

function run(cmd, label) {
  try {
    execSync(cmd, { stdio: 'inherit' });
  } catch (e) {
    console.error(`[predev] ${label} warning (continuing)`);
  }
}

run('node scripts/validate-data.js', 'data validation');
