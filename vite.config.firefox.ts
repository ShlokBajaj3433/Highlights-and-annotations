import { defineConfig, mergeConfig } from 'vite';
import baseConfig from './vite.config';

export default mergeConfig(
  baseConfig,
  defineConfig({
    define: {
      'process.env.BROWSER': '"firefox"',
    },
    build: {
      outDir: 'dist-firefox',
    },
  })
);
