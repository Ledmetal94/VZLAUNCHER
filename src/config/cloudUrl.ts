// When served by the local bridge (.exe), use /cloud proxy (same-origin, no CORS).
// When served by Vercel, VITE_CLOUD_URL is set at build time to the real backend URL.
export const CLOUD_URL = import.meta.env.VITE_CLOUD_URL
  || (typeof window !== 'undefined' ? `${window.location.origin}/cloud` : 'http://localhost:3002')
