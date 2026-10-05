/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Two builds:
//  - `vite build`               → dist/          (static host: Netlify / Vercel / GitHub Pages)
//  - `vite build --mode single` → dist-single/   (one self-contained index.html, opens with a double-click)
export default defineConfig(({ mode }) => {
  const single = mode === 'single';
  return {
    base: './',
    plugins: single ? [react(), viteSingleFile()] : [react()],
    build: {
      outDir: single ? 'dist-single' : 'dist',
      emptyOutDir: true,
      // Inline every asset (fonts included) in the single-file build.
      assetsInlineLimit: single ? 100_000_000 : 4096,
    },
    test: {
      // Speed mode: formulas + engine determinism only. The full suite (`npm run test:all`) returns in Sprint D.
      include: process.env.TEST_ALL ? ['tests/unit/**/*.test.ts'] : ['tests/unit/formulas.test.ts', 'tests/unit/determinism.test.ts'],
      environment: 'node',
    },
  };
});
