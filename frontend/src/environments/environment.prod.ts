export const environment = {
  production: true,
  // TODO: Update these URLs when deploying to production
  apiUrl: 'http://localhost:3000/api',
  apiBaseUrl: 'http://localhost:3000',
  socketUrl: 'http://localhost:3000',
  session: {
    checkIntervalMs: 10000,           // Check every 10 seconds
    warningTimeMs: 5 * 60 * 1000,     // Fixed: 5 minutes before expiration
    showCountdown: true
  }
};