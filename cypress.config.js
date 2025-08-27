
import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    // You can add baseUrl or other config options here
  baseUrl: process.env.BASE_URL || 'http://localhost:4322', // Allow override; default to 4322 as exposed
    specPattern: 'cypress/e2e/**/*.@(spec|test|cypress).[jt]s',
    viewportWidth: 1280,
    viewportHeight: 720,
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
});