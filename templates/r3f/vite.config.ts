import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  // Relative asset URLs, so the built dist/ works from any folder or sub-path
  // (a static host, a GitHub Pages project path, or tw check serving dist/ as its root).
  base: './',
  build: {
    // <Canvas> registers every three export (so JSX like <mesh> works), which
    // keeps all of three in the bundle; with react-dom and fiber an empty scene
    // is about 1.2 MB minified (330 kB gzipped), over Vite's 500 kB default.
    // This limit still flags real growth, where lazy-loading with import() pays off.
    chunkSizeWarningLimit: 1600,
  },
});
