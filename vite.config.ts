import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'next/link': path.resolve(__dirname, './src/shims/next-link.tsx'),
      'next/navigation': path.resolve(__dirname, './src/shims/next-navigation.ts'),
      'next/error': path.resolve(__dirname, './src/shims/next-error.tsx'),
      'next-themes': path.resolve(__dirname, './src/shims/next-themes.tsx'),
    },
  },
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
    },
  },
  envPrefix: ['VITE_', 'TAURI_ENV_*'],
  define: {
    'process.env': {
      NEXT_PUBLIC_VERSION: JSON.stringify('1.12.2'),
    },
  },
});
