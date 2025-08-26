// src/utils/slugify.js
// Robust slugify: normalize accents, convert & to 'and', collapse dashes/spaces
export default function slugify(text) {
  if (text == null) return '';
  return String(text)
    // Unicode normalize and strip diacritics
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    // Common symbol replacements
    .replace(/&/g, ' and ')
    .replace(/[@+]/g, ' ')
    .toLowerCase()
    // Replace any non-alphanumeric with a dash
    .replace(/[^a-z0-9]+/g, '-')
    // Collapse multiple dashes
    .replace(/-+/g, '-')
    // Trim leading/trailing dashes
    .replace(/^-|-$/g, '');
}