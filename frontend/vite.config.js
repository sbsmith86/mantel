import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/world': 'http://localhost:3000',
      '/debug': 'http://localhost:3000',
    },
  },
})
