import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * Served from a GitHub Pages project site, so everything lives under /candela/.
 * Set unconditionally rather than behind an env flag, so dev, preview, the tests
 * and the deployed app all resolve paths the same way.
 *
 * A service worker only registers over HTTPS, and without one the home-screen
 * icon opens a blank page as soon as the phone is off the network. That is the
 * whole reason this is hosted at all — the studio has no signal.
 */
const BASE = '/candela/';

export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png', 'favicon.png'],
      manifest: {
        name: 'Candela',
        short_name: 'Candela',
        description: 'Prep notes for teaching Cuban salsa at La Candela',
        lang: 'en',
        start_url: BASE,
        scope: BASE,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#FBF7F3',
        theme_color: '#FBF7F3',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // The studio has no signal. Everything the shell needs is precached;
        // nothing in the capture path ever touches the network.
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        navigateFallback: `${BASE}index.html`,
      },
    }),
  ],
  server: { port: 5173 },
  preview: { port: 4173 },
});
