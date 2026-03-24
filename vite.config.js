import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true, // Expose to network for phone access
    proxy: {
      '/api': {
        target: 'http://localhost:5000',  
        changeOrigin: true
      }
    }
  },
  // ADD THIS SECTION FOR ANDROID COMPATIBILITY
  build: {
    target: 'es2015', 
    cssTarget: 'chrome61',
    outDir: 'dist'
  }
})