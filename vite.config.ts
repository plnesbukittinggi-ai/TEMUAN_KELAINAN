
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['react-leaflet', 'leaflet', '@react-leaflet/core']
  },
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
