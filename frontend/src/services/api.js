/**
 * Axios API instance for VIAROAD frontend.
 *
 * HOW BASE URL WORKS:
 * - Local dev:    proxy in vite.config.js routes /api → http://localhost:5000
 *                 so baseURL = '/api' works fine locally.
 * - Vercel prod:  VITE_API_URL env var is set to your backend URL
 *                 e.g. https://viaroad-api.onrender.com
 *                 baseURL becomes 'https://viaroad-api.onrender.com/api'
 *
 * Set VITE_API_URL in Vercel dashboard → Project Settings → Environment Variables.
 * Leave it empty for local dev (proxy handles it).
 */

import axios from 'axios'

// In production VITE_API_URL = 'https://your-backend.onrender.com'
// In dev it is undefined, so we fall back to '/api' (Vite proxy handles it)
const BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api'

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,         // send cookies (JWT auth)
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// ── Response interceptor ─────────────────────────────
// Unwrap errors into a clean Error message so every
// catch block just reads err.message
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.message ||
      'Something went wrong. Please try again.'

    // Don't throw on 401 for /auth/me — it just means not logged in
    if (
      error.response?.status === 401 &&
      (error.config?.url?.includes('/auth/me') || error.config?.url?.includes('/admin/auth/me'))
    ) {
      return Promise.reject(new Error('unauthenticated'))
    }

    return Promise.reject(new Error(message))
  }
)

export default api
