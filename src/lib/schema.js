// Minimal schema generator used by the build validation script.
// Returns a JSON-LD string representing a simple WebPage + Service/LocalBusiness
export function generateSchema(suburb = null, suburbs = [], service = 'bond-cleaning') {
  // During build scripts import.meta.env may be undefined. Prefer process.env.SITE if available.
  const siteFromEnv = (typeof process !== 'undefined' && process.env && process.env.SITE) ? process.env.SITE : undefined;
  const origin = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.SITE) || siteFromEnv || 'https://onendonebondclean.com.au';
  const cleanOrigin = String(origin).replace(/\/+$/,'');
  const pageUrl = suburb ? `${origin}/services/${service}/${suburb.slug || suburb.name || ''}/` : `${origin}/`;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    url: pageUrl,
    mainEntity: {
      '@type': 'Service',
      name: service,
      areaServed: Array.isArray(suburbs) ? suburbs.slice(0,5).map(s => ({ '@type': 'Place', name: s.name || s })) : undefined
    }
  };

  return JSON.stringify(schema);
}

export default { generateSchema };
