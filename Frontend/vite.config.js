import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import portOsApi from '../Backend/api.mjs'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), portOsApi()],
  server: {
    proxy: {
      '/api/simulations': 'http://localhost:3000',
      '/api/crane-prediction': 'http://localhost:3000',
    },
  },
  preview: {
    proxy: {
      '/api/simulations': 'http://localhost:3000',
      '/api/crane-prediction': 'http://localhost:3000',
    },
  },
})
