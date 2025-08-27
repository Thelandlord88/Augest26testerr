// scripts/check-env.js
try { await import('dotenv/config'); } catch {}

function show(k) {
  const v = process.env[k];
  return v === undefined ? 'undefined' : (v === '' ? '""' : v);
}

console.log('--- ENV SNAPSHOT ---');
['USE_EDGE','NODE_ENV','BASE_URL','PORT'].forEach(k => {
  console.log(k.padEnd(10, ' '), '=', show(k));
});
console.log('--------------------');
