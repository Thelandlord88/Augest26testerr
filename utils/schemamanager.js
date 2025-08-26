// src/utils/schemaManager.js
/**
 * schemaManager.js
 *
 * This module manages the dynamic updates of the JSON-LD schema on the client side.
 * It handles loading suburb data, generating schema markup, validating it,
 * and injecting it into the page. It also provides error handling and fallbacks.
 *
 * Purpose:
 * - Decouples schema logic from the Astro component.
 * - Ensures valid schema is always injected.
 * - Improves performance by caching data.
 * - Provides robust error handling.
 */

// --- 1. Static Imports for Performance and Reliability ---
// These modules are bundled with the application, avoiding runtime network requests.
import { generateSchema } from './schema.js';
import suburbs from '../data/suburbs.json';

// --- 2. Define a Robust Fallback Schema ---
// This ensures that even if something goes wrong, valid schema markup is present.
// This protects SEO and prevents broken rich results.
const FALLBACK_SCHEMA = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "One N Done Bond Clean", // <-- Ensure this matches your business name exactly
  "url": "https://onendonebondclean.com.au", // <-- Ensure this is your canonical URL
  "image": "https://onendonebondclean.com.au/images/og.jpg", // <-- Ensure this path is correct
  "telephone": "+61405779420", // <-- Ensure this is your correct phone number
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Redbank Plains",
    "addressRegion": "QLD",
    "postalCode": "4301",
    "addressCountry": "AU"
  },
  // Optionally, list all served areas if relevant for the fallback
  "areaServed": suburbs.map(suburb => ({ "@type": "City", "name": suburb.name }))
}, null, 2); // Pretty print for easier debugging if needed in dev tools

// --- 3. Utility Function for JSON Validation ---
// Critical for preventing malformed JSON-LD from breaking the page or SEO.
function isValidJson(str) {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
}

// --- 4. Cache the DOM Element for Efficiency ---
// Finding the same element repeatedly is inefficient. Cache it after the first lookup.
let schemaScript = null;

/**
 * Initializes the schema manager.
 * 1. Finds the target `<script id="dynamic-schema">` element in the DOM.
 * 2. Gets the user's preferred suburb from localStorage (or defaults).
 * 3. Triggers an update to display the correct schema for that suburb.
 */
export function initializeSchema() {
  // --- Find and cache the script element ---
  if (!schemaScript) {
    schemaScript = document.getElementById('dynamic-schema');
  }

  // --- Error handling: If the element isn't found, log a warning and stop. ---
  if (!schemaScript) {
    console.warn('[SchemaManager] Schema script tag with id "dynamic-schema" not found. Cannot initialize.');
    return; // Exit early if the element is missing.
  }

  // --- Get the preferred suburb from localStorage or use a default. ---
  // This allows the schema to reflect the user's last known location choice.
  const preferredSuburb = localStorage.getItem('preferredSuburb') || "Redbank Plains"; // Default suburb

  // --- Update the schema based on the preferred suburb. ---
  updateSchemaForSuburb(preferredSuburb);
}

/**
 * Updates the content of the schema script tag for a specific suburb.
 * @param {string} suburbName - The name of the suburb to generate schema for.
 */
export function updateSchemaForSuburb(suburbName) {
  // --- Error handling: Ensure the script element is available. ---
  if (!schemaScript) {
    console.warn('[SchemaManager] Cannot update schema: script element is not initialized.');
    // Revert to fallback if the element is somehow lost after initialization
    if (document.getElementById('dynamic-schema')) {
         document.getElementById('dynamic-schema').textContent = FALLBACK_SCHEMA;
    }
    return;
  }

  try {
    // --- Find the suburb data in the statically imported JSON. ---
    // This is efficient and avoids network requests.
    const suburbData = suburbs.find(s => s.name === suburbName);

    // --- Handle case where suburb data is not found. ---
    if (!suburbData) {
      console.warn(`[SchemaManager] Suburb data not found for "${suburbName}". Reverting to fallback schema.`);
      schemaScript.textContent = FALLBACK_SCHEMA;
      return; // Exit early if suburb data is missing.
    }

    // --- Generate the new schema string using the utility function. ---
  const newSchema = generateSchema(suburbData, suburbs, 'bond-cleaning');

    // --- Validate the generated schema before injecting it. ---
    // This is a critical step to prevent broken JSON-LD.
    if (!isValidJson(newSchema)) {
      console.error("[SchemaManager] Generated schema is invalid JSON. Reverting to fallback.", { suburbName, suburbData, generatedSchema: newSchema });
      schemaScript.textContent = FALLBACK_SCHEMA;
      return; // Exit early if validation fails.
    }

    // --- If everything is valid, update the content of the script tag. ---
    schemaScript.textContent = newSchema;

    // --- Optional: Log successful updates for debugging (in development). ---
    // console.log(`[SchemaManager] Successfully updated schema for suburb: ${suburbName}`);

  } catch (error) {
    // --- Catch any unexpected errors during the process. ---
    console.error('[SchemaManager] An unexpected error occurred during schema generation or update:', error);

    // --- As a last resort, ensure the fallback schema is displayed. ---
    schemaScript.textContent = FALLBACK_SCHEMA;

    // --- Optional: Report the error to Google Analytics (if gtag is available). ---
    // This helps monitor for runtime issues in production.
    if (typeof gtag === 'function') {
      gtag('event', 'exception', {
        'description': `SchemaManager_Error: ${error.message}`,
        'fatal': false // Not fatal to the overall site functionality.
      });
    }
  }
}