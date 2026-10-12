import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  worker: { format: 'es' },
  // tres páginas: el estudio, la arena que prueba el kit deportivo y el visor del kit
  build: { rollupOptions: { input: { main: 'index.html', arena: 'arena.html', visor: 'visor.html' } } },
  test: {
    include: ['src/**/*.test.ts'],
    testTimeout: 30000,
  },
});
