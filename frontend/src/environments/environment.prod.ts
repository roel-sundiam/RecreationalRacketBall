export const environment = {
  production: true,
  // These will be replaced by Netlify environment variables at build time
  apiUrl: (window as any).__env?.BACKEND_URL || 'https://your-backend-url.onrender.com/api',
  apiBaseUrl: (window as any).__env?.BACKEND_URL || 'https://your-backend-url.onrender.com',
  socketUrl: (window as any).__env?.BACKEND_URL || 'https://your-backend-url.onrender.com',
  session: {
    checkIntervalMs: 10000,           // Check every 10 seconds
    warningTimeMs: 5 * 60 * 1000,     // Fixed: 5 minutes before expiration
    showCountdown: true
  }
};