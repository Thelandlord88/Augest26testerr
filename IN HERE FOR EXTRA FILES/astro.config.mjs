import { defineConfig } from 'astro/config';
import netlify from '@astrojs/netlify';
import tailwind from '@tailwindcss/vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Opt-in Edge middleware (default off locally / CI). Set USE_EDGE=true to enable.
const USE_EDGE = process.env.USE_EDGE === 'true';

export default defineConfig({
  site: 'https://onendonebondclean.com.au',
  output: 'static', // keep current static output (adjust if you intentionally move to SSR)
  adapter: netlify({
    edgeMiddleware: USE_EDGE,
  }),
  integrations: [
  // Tailwind is handled via PostCSS and `src/styles/input.css`.
  ],
  viewTransitions: {
    fallback: 'animate',
  },
  vite: {
    plugins: [tailwind()],
    resolve: {
      alias: {
        '~': path.resolve(__dirname, './src'),
      },
    },
  },
});