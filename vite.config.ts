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
      include: ['tests/unit/**/*.test.ts'],
      environment: 'node',
    },
  };
});
