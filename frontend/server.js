const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 4200;

// Serve static files from dist directory
app.use(express.static(path.join(__dirname, 'dist/RecreationalRacketBall/browser')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'frontend' });
});

// Redirect all other routes to index.html for SPA routing
app.get('/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist/RecreationalRacketBall/browser', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Frontend server running on port ${PORT}`);
  console.log(`📱 Access at http://localhost:${PORT}`);
});
