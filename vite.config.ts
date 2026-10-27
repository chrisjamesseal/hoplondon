import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      // Named "learn" so the built files are assets/learn-*.js, which the auto update check looks for
      input: { learn: resolve(import.meta.dirname, 'index.html') },
    },
  },
})
