import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/**
 * GitHub Pages serves a project site from https://<user>.github.io/<repo>/,
 * so every asset URL needs the repo name as a prefix (plan §9.1).
 *
 * Rename the repo? Change this. Deploying somewhere that serves from the
 * domain root instead? Build with `VITE_BASE=/ npm run build`.
 */
const BASE = process.env.VITE_BASE ?? '/acrylic-mockup/'

export default defineConfig({
  base: BASE,
  plugins: [react()],
  build: {
    // three.js is most of this; it is one dependency and code-splitting it
    // would not help first paint, since nothing renders without it.
    chunkSizeWarningLimit: 1500,
  },
})
