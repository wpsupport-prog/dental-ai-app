import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'react': path.resolve(__dirname, './node_modules/react'),
      'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
    },
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'lucide-react'],
  },
  server: {
    port: 5173,
    host: '0.0.0.0', // Exposes dev server on LAN for mobile device access
    strictPort: true,
    
    // -------------------------------------------------------------
    // FIX FOR CORS BLOCKING: DEV SERVER PROXY CONFIGURATION
    // -------------------------------------------------------------
    proxy: {
      // Proxy API requests to FastAPI backend
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
      },
      // Proxy uploads/temp images to FastAPI backend so previews load seamlessly
      '/uploads': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
      },
    },

    watch: {
      // Ignore Rust build target directory to prevent EBUSY lock errors in Tauri
      ignored: ['**/src-tauri/**'],
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});