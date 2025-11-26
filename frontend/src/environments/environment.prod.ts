export const environment = {
  production: true,
  apiUrl: 'https://tennis-club-rt2-backend.onrender.com/api',
  apiBaseUrl: 'https://tennis-club-rt2-backend.onrender.com',
  socketUrl: 'https://tennis-club-rt2-backend.onrender.com',
  session: {
    checkIntervalMs: 10000,           // Check every 10 seconds
    warningTimeMs: 5 * 60 * 1000,     // Fixed: 5 minutes before expiration
    showCountdown: true
  }
};