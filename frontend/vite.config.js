import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1', // Listen on IPv4 to match Flask backend
    port: 5173,
    // Dev-only: proxy API calls to Flask running on 127.0.0.1:5001
    proxy: {
      '/api': 'http://127.0.0.1:5001'
    }
  }
})
