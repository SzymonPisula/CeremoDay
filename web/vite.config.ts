import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    // Tailwind v4: without this plugin, utility classes and @apply won't be generated.
    tailwindcss(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        name: 'CeremoDay',
        short_name: 'CeremoDay',
        start_url: '/',
        display: 'standalone',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      devOptions: {
        enabled: true, // umożliwia testowanie PWA w dev
      },
    }),
  ],

  server: {
    port: 5173,
    open: true, // automatycznie otwiera przeglądarkę
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },

  resolve: {
    alias: {
      '@': '/src', // ułatwia importy np. "@/components/Modal"
    },
  },

  define: {
    'process.env': process.env,
  },
});
