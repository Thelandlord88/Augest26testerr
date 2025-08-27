// utils/relatedSuburbs.js
export function getRelatedSuburbs(suburb, suburbs, count = 4) {
  const samePostcode = suburbs.filter(
    s => s.postcode === suburb.postcode && s.name !== suburb.name
  );
  const fallback = suburbs.filter(s => s.name !== suburb.name);
  const list = samePostcode.length >= count ? samePostcode : fallback;
  return list.sort(() => 0.5 - Math.random()).slice(0, count);
}
