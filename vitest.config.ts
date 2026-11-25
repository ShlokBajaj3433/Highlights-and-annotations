import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/**',
        'tests/**',
        'dist/**',
        '*.config.ts',
        '*.config.js',
        'src/**/*.d.ts',
        'src/**/*.html',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@background': path.resolve(__dirname, 'src/background'),
      '@content': path.resolve(__dirname, 'src/content'),
      '@popup': path.resolve(__dirname, 'src/popup'),
      '@sidepanel': path.resolve(__dirname, 'src/sidepanel'),
      '@offscreen': path.resolve(__dirname, 'src/offscreen'),
    },
  },
});
