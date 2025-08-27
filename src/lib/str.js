export function trimSlashes(s = '') {
  return String(s).replace(/^\/+|\/+$/g, '');
}

export function withTrailingSlash(u = '') {
  if (!u) return u;
  if (u.endsWith('/')) return u;
  return u + '/';
}

export default { trimSlashes, withTrailingSlash };
