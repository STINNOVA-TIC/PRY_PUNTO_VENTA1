import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true, // Escuchar en todas las interfaces de red local (0.0.0.0)
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: false, // Mantener el Host original (IP local) para que las URLs de imágenes se generen correctamente
      },
      '/socket.io': {
        target: 'http://localhost:5000',
        ws: true,
        changeOrigin: false,
      },
      '/img': {
        target: 'http://localhost:5000',
        changeOrigin: false,
      },
    },
  },
});