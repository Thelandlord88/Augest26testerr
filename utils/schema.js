// src/utils/schema.js

/**
 * Generates a LocalBusiness JSON-LD schema.
 * It can be specific to a suburb if one is provided, otherwise it's generic.
 * This function is designed to be run ON THE SERVER.
 * @param {object | null} currentSuburb - The suburb object for the current page, or null for the homepage.
 * @param {object[]} allSuburbs - The complete list of all suburbs served.
 * @returns {string} A stringified JSON-LD schema.
 */
export function generateSchema(currentSuburb, allSuburbs, serviceSlug = 'bond-cleaning') {
  if (!Array.isArray(allSuburbs)) {
    console.error('Schema generation failed: `allSuburbs` is not an array.');
    return '{}';
  }

  // --- Determine if this is a specific page or the generic homepage ---
  const isSpecificPage = currentSuburb && currentSuburb.name;
  const serviceHuman = String(serviceSlug || 'bond-cleaning').replace(/-/g, ' ');
  
  // Define the name and URL based on the context.
  const name = isSpecificPage 
    ? `One N Done ${serviceHuman} – ${currentSuburb.name}` 
    : `One N Done ${serviceHuman}`;

  const url = isSpecificPage 
    ? `/services/${serviceSlug}/${currentSuburb.slug}/`
    : `/services/${serviceSlug}/`;

  const schema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": name,
  "url": url,
    "image": "https://onendonebondclean.com.au/images/og.jpg",
    "telephone": "+61405779420",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Redbank Plains",
      "addressRegion": "QLD",
      "postalCode": "4301",
      "addressCountry": "AU"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": isSpecificPage ? currentSuburb.coords.lat : -27.6608,
      "longitude": isSpecificPage ? currentSuburb.coords.lng : 152.8609
    },
    "areaServed": allSuburbs.map(suburb => ({
      "@type": "City",
      "name": suburb.name
    }))
  };

  return JSON.stringify(schema, null, 2);
}