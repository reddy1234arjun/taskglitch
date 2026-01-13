import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Use an ESM-safe URL to resolve the `src` directory without Node-specific imports
const srcPath = new URL('./src/', import.meta.url).pathname;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': srcPath,
    },
  },
});

