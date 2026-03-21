import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@entities': resolve(__dirname, 'src/entities'),
      '@use-cases': resolve(__dirname, 'src/use-cases'),
      '@adapters': resolve(__dirname, 'src/adapters'),
      '@ui': resolve(__dirname, 'src/ui'),
      '@controller': resolve(__dirname, 'src/controller'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: ['src/main.tsx', 'src/vite-env.d.ts'],
    },
  },
});
