// Shared route utilities
import path from 'node:path';

export function normRoute(inputPath) {
  // Convert a dist file path or route-like string to a normalized URL path
  let r = String(inputPath || '');
  // Use posix separators
  r = r.split(path.sep).join('/');
  // Strip leading dist/
  r = r.replace(/^dist\//, '');
  // Remove index.html and .html endings
  r = r.replace(/index\.html$/i, '');
  r = r.replace(/\.html$/i, '');
  // Ensure leading slash
  if (!r.startsWith('/')) r = '/' + r;
  // Decode URI components if present
  try { r = decodeURIComponent(r); } catch {}
  // Collapse multiple slashes
  r = r.replace(/\/+/, '/');
  // Enforce trailing slash for non-file, non-root
  if (r !== '/' && !/\.[a-z0-9]+$/i.test(r) && !r.endsWith('/')) r += '/';
  return r;
}
