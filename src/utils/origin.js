// Minimal resolveOrigin helper used by layouts to determine the site's origin.
export function resolveOrigin(AstroLike = {}) {
  // Prefer explicit SITE env, then fallback to Astro-like origin, then default
  const site = import.meta.env.SITE || (AstroLike?.site || null) || 'https://onendonebondclean.com.au';
  try {
    return new URL(site).origin;
  } catch (e) {
    // If not a full URL, attempt to prefix with https://
    return site.startsWith('http') ? site : `https://${site}`;
  }
}

export default resolveOrigin;
