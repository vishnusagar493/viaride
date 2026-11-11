import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Vite configuration for VIAROAD frontend.
 *
 * Dev proxy: routes /api and /uploads to localhost:5000 so you don't
 * need CORS config during local development.
 *
 * Production: Vercel serves the static build. The proxy is NOT used in
 * production — axios uses VITE_API_URL env var instead (set in Vercel).
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],

    // Makes all pages reload correctly on Vercel (handled by vercel.json rewrites)
    build: {
      outDir: 'dist',
      sourcemap: false,
      rollupOptions: {
        output: {
          // Split large vendor chunks for faster loads
          manualChunks: {
            vendor:   ['react', 'react-dom'],
            router:   ['react-router-dom'],
            http:     ['axios'],
            datepick: ['react-datepicker', 'date-fns'],
          },
        },
      },
    },

    // Dev server — proxy /api and /uploads to local backend
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true,
          secure: false,
        },
        '/uploads': {
          target: 'http://localhost:5000',
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})
