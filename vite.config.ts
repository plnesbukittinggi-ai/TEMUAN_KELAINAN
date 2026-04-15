
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'fabric': path.resolve(__dirname, 'node_modules/fabric/dist/fabric.js'),
    },
  },
  define: {
    // Memastikan API Key tersedia secara global di client-side
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || ''),
    'process.env.GEMINI_API_KEY': JSON.stringify(process.env.GEMINI_API_KEY || '')
  },
  server: {
    port: 3000
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  }
});
