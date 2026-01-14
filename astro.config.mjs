import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
// Sitemap temporarily disabled due to plugin bug
// import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://freezerbatchcocktails.com',
  integrations: [
    tailwind(),
    // sitemap(), // Re-enable after fixing plugin
  ],
  build: {
    inlineStylesheets: 'auto',
  },
});
