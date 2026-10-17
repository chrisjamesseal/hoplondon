import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      // Two apps share one build: hop (budgeting) at / and leap (learning) at /learn/
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        learn: resolve(import.meta.dirname, 'learn/index.html'),
      },
    },
  },
})
