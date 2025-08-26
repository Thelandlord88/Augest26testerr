// Phase 1: Integrate Build-Time Schema Validator
// This script runs in a Node.js environment during your build process.

import fs from 'fs';
import path from 'path';

// We must dynamically import our ES modules into this CommonJS-style script.
// This is a standard pattern for build scripts.
async function validate() {
  console.log('🛡️  Starting schema validation...');

  // Dynamically import the same modules our application uses.
  const { generateSchema } = await import('../src/utils/schema.js');
  const suburbs = JSON.parse(fs.readFileSync(path.resolve('./src/data/suburbs.json'), 'utf-8'));

  let invalidCount = 0;

  // Test Case 1: The generic, homepage schema (passing null for currentSuburb)
  try {
    const genericSchemaString = generateSchema(null, suburbs, 'bond-cleaning');
    JSON.parse(genericSchemaString); // If this throws, the JSON is invalid.
    console.log('✅  Generic homepage schema is valid.');
  } catch (e) {
    console.error('❌ FATAL: Generic homepage schema failed validation!', e);
    invalidCount++;
  }

  // Test Case 2: Iterate and validate schema for every single suburb.
  const services = ['bond-cleaning', 'spring-cleaning', 'bathroom-deep-clean'];
  for (const suburb of suburbs) {
    for (const svc of services) {
      try {
        const suburbSchemaString = generateSchema(suburb, suburbs, svc);
        JSON.parse(suburbSchemaString); // The core validation check.
      } catch (e) {
        console.error(`❌ FATAL: Schema for "${suburb.name}" (${svc}) failed validation!`, e);
        invalidCount++;
      }
    }
  }

  if (invalidCount === 0) {
    console.log('🎉 All schema generated successfully and are valid. Build can proceed.');
    process.exit(0); // Success
  } else {
    console.error(`\n🔥 Validation failed for ${invalidCount} schema. Build halted.`);
    console.error('🔥 Check the errors above. A broken schema must not be deployed.');
    process.exit(1); // Failure
  }
}

validate();