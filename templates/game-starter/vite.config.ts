import { defineConfig } from 'vite';

export default defineConfig({
  // Relative asset URLs so dist/ works from any folder or sub-path (and under tw check).
  base: './',
  build: {
    // rapier3d-compat inlines its WASM as base64: a 4.3 MB chunk (1.7 MB gzipped),
    // loaded by a dynamic import after the first frame. To ship the .wasm as its own
    // file instead, switch to @dimforge/rapier3d with vite-plugin-wasm.
    chunkSizeWarningLimit: 4500,
  },
});
