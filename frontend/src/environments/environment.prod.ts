export const environment = {
  production: true,
  apiUrl: 'https://recreationalracketball.onrender.com/api',
  apiBaseUrl: 'https://recreationalracketball.onrender.com',
  socketUrl: 'https://recreationalracketball.onrender.com',
  session: {
    checkIntervalMs: 10000,           // Check every 10 seconds
    warningTimeMs: 5 * 60 * 1000,     // Fixed: 5 minutes before expiration
    showCountdown: true
  }
};