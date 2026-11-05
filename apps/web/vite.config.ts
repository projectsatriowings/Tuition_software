import { defineConfig, createLogger } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const customLogger = createLogger();
const originalLoggerError = customLogger.error.bind(customLogger);

// Suppress normal browser disconnects / SSE teardowns from polluting the dev terminal
customLogger.error = (msg, options) => {
  const text = typeof msg === 'string' ? msg : options?.error?.message || '';
  if (
    text.includes('ECONNRESET') ||
    text.includes('socket hang up') ||
    (text.includes('http proxy error') && text.includes('/notifications/stream'))
  ) {
    return;
  }
  originalLoggerError(msg, options);
};

// https://vitejs.dev/config/
export default defineConfig({
  customLogger,
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@fix-webm-duration/fix': path.resolve(__dirname, '../../node_modules/@fix-webm-duration/fix/src/index.js'),
    },
  },
  optimizeDeps: {
    include: ['@fix-webm-duration/fix'],
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react/') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'vendor-react';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('framer-motion')) {
              return 'vendor-motion';
            }
            if (id.includes('leaflet')) {
              return 'vendor-leaflet';
            }
          }
        },
      },
    },
  },
  server: {
    port: 3000,
    strictPort: true,
    host: 'localhost',
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err: any) => {
            // Expected socket drops on browser refresh / SSE disconnect
            if (
              err?.code === 'ECONNRESET' ||
              err?.code === 'EPIPE' ||
              err?.code === 'ECONNABORTED' ||
              err?.message?.includes('ECONNRESET') ||
              err?.message?.includes('socket hang up')
            ) {
              return;
            }
            console.error('[vite proxy error]', err);
          });
        },
      },
    },
  },
});
