import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5157',
        changeOrigin: true,
      },
      '/hubs': {
        target: 'http://localhost:5157',
        ws: true,
        changeOrigin: true,
      },
    },
  },
})
