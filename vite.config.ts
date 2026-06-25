import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/login': 'http://localhost:3001',
      '/signup': 'http://localhost:3001',
      '/onboard': 'http://localhost:3001',
      '/api': 'http://localhost:3001',
      '/telegram': 'http://localhost:3001',
    },
  },
});
