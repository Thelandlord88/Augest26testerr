export function graph({ biz, service, suburb, pageUrl }: any) {
  const base = 'https://onen-done.au/#';
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@id': base + 'org',
        '@type': ['Organization', 'LocalBusiness'],
        name: biz.name,
        url: 'https://onen-done.au/',
        logo: 'https://onen-done.au/logo.png',
        areaServed: { '@id': `${base}suburb-${suburb.slug}` }
      },
      {
        '@id': `${base}service-${service.slug}`,
        '@type': 'Service',
        name: service.title,
        provider: { '@id': base + 'org' },
        serviceArea: { '@id': `${base}suburb-${suburb.slug}` }
      },
      {
        '@id': `${base}suburb-${suburb.slug}`,
        '@type': 'Place',
        name: suburb.name,
        address: {
          '@type': 'PostalAddress',
          addressLocality: suburb.name,
          postalCode: suburb.postcode,
          addressRegion: suburb.state,
          addressCountry: 'AU'
        }
      },
      {
        '@id': base + 'webpage',
        '@type': 'WebPage',
        url: pageUrl,
        isPartOf: { '@id': base + 'org' },
        about: [{ '@id': `${base}service-${service.slug}` }, { '@id': `${base}suburb-${suburb.slug}` }]
      }
    ]
  };
}
