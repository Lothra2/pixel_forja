import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  worker: { format: 'es' },
  // dos páginas: el estudio y la arena que prueba el kit deportivo
  build: { rollupOptions: { input: { main: 'index.html', arena: 'arena.html' } } },
  test: {
    include: ['src/**/*.test.ts'],
    testTimeout: 30000,
  },
});
