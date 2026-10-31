import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base so the built site works both at a domain root and under a
  // GitHub Pages sub-path (e.g. /Family-Fun/). Classic game scripts in
  // public/game/ are loaded with relative paths from src/main.js for the same reason.
  base: './',
  build: { outDir: 'dist', emptyOutDir: true },
});
