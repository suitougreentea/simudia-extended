import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import checker from 'vite-plugin-checker'
import { VitePWA } from 'vite-plugin-pwa'
import packageJson from './package.json'

// https://vitejs.dev/config/
export default defineConfig({
  base: "/simudia-extended/",
  plugins: [
    vue(),
    checker({ vueTsc: true }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'pwa-icon-512.png'],
      manifest: {
        name: "SimuDia-Extended",
        short_name: "SimuDiaEx",
        description: "An interactive editor for planning timetables used in Simutrans-Extended",
        theme_color: "#6200ee",
        icons: [
          {
            src: "pwa-icon-192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "pwa-icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "pwa-icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable"
          },
        ],
      }
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  define: {
    "__VERSION__": `"${packageJson.version}"`,
    "__BUILD_DATE__": JSON.stringify(new Date())
  }
})
