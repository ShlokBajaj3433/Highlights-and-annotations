import path from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      input: {
        background: 'src/background/index.ts',
        content: 'src/content/index.ts',
        popup: 'src/popup/index.html',
        sidepanel: 'src/sidepanel/index.html',
        offscreen: 'src/offscreen/index.html',
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/\.(png|jpe?g|gif|svg|woff2?)$/.test(assetInfo.name)) {
            return `assets/[name].[hash].${ext}`;
          }
          if (ext === 'css') {
            return `styles/[name].[hash].${ext}`;
          }
          return `assets/[name].[hash].${ext}`;
        },
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
  plugins: [],
});
