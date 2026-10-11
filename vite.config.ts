import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `VITE_BASE` lets the same build target a sub-path (GitHub Pages) or a
// domain root (Hostinger / any static host).
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        // Split the libraries that change far less often than our own code,
        // so a redeploy does not invalidate the whole download.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return 'react';
          if (id.includes('@dnd-kit')) return 'dnd';
          if (id.includes('i18next')) return 'i18n';
          if (id.includes('lucide-react')) return 'icons';
          return 'vendor';
        },
      },
    },
  },
  server: { host: '127.0.0.1', port: 5173 },
});
