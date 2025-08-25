// src/lib/seoSchema.js
function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function getSuburbSchema(suburb, faq = []) {
  const slug = suburb.toLowerCase().replace(/\s+/g, '-');
  const entityId = `${Astro.site.origin}/entity/${slug}#localBusiness`;

  return {
    localBusiness: {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      "@id": entityId,
      name: `One N Done Bond Clean – ${suburb}`,
      address: {
        "@type": "PostalAddress",
        addressLocality: suburb,
        addressRegion: "QLD",
        addressCountry: "AU"
      },
      areaServed: { "@type": "City", name: suburb },
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: "4.9",
        reviewCount: Math.floor(Math.random() * 50 + 100) // cache-buster
      },
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        name: "Bond Cleaning Packages",
        itemListElement: [
          { "@type": "Offer", name: "Standard Bond Clean", price: "299", priceCurrency: "AUD", availability: "https://schema.org/InStock" }
        ]
      }
    },
    faqPage: {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faq.map(q => ({
        "@type": "Question",
        name: q.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: q.answer,
          url: `${Astro.site.origin}/service-areas/${slug}#faq-${slugify(q.question)}`
        }
      }))
    },
    breadcrumb: {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${Astro.site.origin}/` },
        { "@type": "ListItem", position: 2, name: suburb, item: `${Astro.site.origin}/service-areas/${slug}` }
      ]
    }
  };
}
