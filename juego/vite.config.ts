import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

// El juego: app aparte que usa el motor gótico de src/engine/gotico directamente.
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: './',
  publicDir: 'public',
  worker: { format: 'es' },
  server: { port: 5190, fs: { allow: ['..'] } },
  build: { outDir: 'dist', emptyOutDir: true, assetsInlineLimit: 0, chunkSizeWarningLimit: 4000, target: 'es2022' },
});
