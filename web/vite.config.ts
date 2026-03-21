import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || '/',
  resolve: {
    alias: {
      '@entities': resolve(__dirname, 'src/entities'),
      '@use-cases': resolve(__dirname, 'src/use-cases'),
      '@adapters': resolve(__dirname, 'src/adapters'),
      '@ui': resolve(__dirname, 'src/ui'),
      '@controller': resolve(__dirname, 'src/controller'),
    },
  },
  build: {
    target: 'es2022',
    sourcemap: true,
  },
  worker: {
    format: 'es',
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
});
