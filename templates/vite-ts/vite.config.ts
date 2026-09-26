import { defineConfig } from 'vite';

export default defineConfig({
  // Relative asset URLs, so the built dist/ works from any folder or sub-path
  // (a static host, a GitHub Pages project path, or tw check serving dist/ as its root).
  base: './',
  build: {
    // three alone is about 560 kB minified (140 kB gzipped), over Vite's 500 kB
    // default, so every three.js app would warn. This limit still flags real
    // growth, the point where lazy-loading big features with import() pays off.
    chunkSizeWarningLimit: 800,
  },
});
