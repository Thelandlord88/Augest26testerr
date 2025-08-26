// scripts/validate-faqs.js
// Validates that all generated suburb FAQs have at least one question and answer

import fs from 'fs';
import path from 'path';
import services from '../src/data/services.json' assert { type: 'json' };
import suburbs from '../src/data/suburbs.json' assert { type: 'json' };

let allValid = true;

// Validate faqs in services.json
for (const svc of services) {
  if (svc.faqs) {
    if (!Array.isArray(svc.faqs) || svc.faqs.length === 0) {
      console.error(`FAQ for service '${svc.slug}' is missing or empty.`);
      allValid = false;
      continue;
    }
    for (const item of svc.faqs) {
      if (!item.q || !item.a) {
        console.error(`FAQ for service '${svc.slug}' has missing q/a:`, item);
        allValid = false;
      }
    }
  }
}

// Validate faqs in suburbs.json
for (const sub of suburbs) {
  if (sub.faqs) {
    if (!Array.isArray(sub.faqs) || sub.faqs.length === 0) {
      console.error(`FAQ for suburb '${sub.slug}' is missing or empty.`);
      allValid = false;
      continue;
    }
    for (const item of sub.faqs) {
      if (!item.q || !item.a) {
        console.error(`FAQ for suburb '${sub.slug}' has missing q/a:`, item);
        allValid = false;
      }
    }
  }
}

if (allValid) {
  console.log('Q: Are all the faq working?');
  console.log('A: Yes they are!');
  process.exit(0);
} else {
  process.exit(1);
}
