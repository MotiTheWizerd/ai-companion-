import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        // Copy content scripts and modules from src to dist
        {
          src: 'src/content/**/*',
          dest: 'src/content'
        },
        {
          src: 'src/modules/**/*',
          dest: 'src/modules'
        },
        // Copy background service worker
        {
          src: 'src/background/**/*',
          dest: 'src/background'
        },
        // Copy manifest.json from public to dist root
        {
          src: 'public/manifest.json',
          dest: '.'
        }
      ]
    })
  ],
  publicDir: false, // Disable default public directory copying
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/index.html'),
      },
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
