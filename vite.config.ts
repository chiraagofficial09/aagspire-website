import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Match exact package folders: a loose includes('react') also caught lucide-react,
        // react-icons, react-query and recharts' react-redux, pulling them into the entry chunk.
        manualChunks(id) {
          const normalized = id.replace(/\\/g, '/');
          if (/\/node_modules\/(react|react-dom|scheduler|react-router|react-router-dom)\//.test(normalized)) {
            return 'vendor-react';
          }
          if (/\/node_modules\/(@tanstack|axios)\//.test(normalized)) {
            return 'vendor-query';
          }
        },
      },
    },
  },
});