import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 5173,
    strictPort: true
  },
  preview: {
    port: 5174,
    strictPort: true
  }
})

