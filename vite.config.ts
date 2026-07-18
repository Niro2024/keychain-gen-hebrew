import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  // manifold-3d הוא מודול emscripten — pre-bundling של Vite שובר את איתור ה-wasm
  optimizeDeps: { exclude: ['manifold-3d'] },
});
