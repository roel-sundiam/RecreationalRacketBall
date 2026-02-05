# Render Deployment Guide

This guide explains how to deploy the RecreationalRacketBall project to Render.

## Prerequisites

1. GitHub repository: https://github.com/roel-sundiam/RecreationalRacketBall
2. Render account: https://render.com
3. All environment variables ready

## Setup Steps

### 1. Connect GitHub Repository to Render

1. Go to https://dashboard.render.com
2. Click "New +" → "Web Service"
3. Select "Connect a Repository"
4. Find and connect `RecreationalRacketBall`
5. Authorize Render to access your GitHub account

### 2. Configure Backend Service

**Name:** recreational-racketball-backend

**Settings:**
- Root Directory: `backend`
- Build Command: `npm install && npm run build`
- Start Command: `npm start`
- Instance Type: Standard (4GB RAM minimum recommended)

**Environment Variables (add all of these):**
```
NODE_ENV = production
PORT = 3000
MONGODB_URI = [Your MongoDB connection string]
SUPABASE_URL = [Your Supabase project URL]
SUPABASE_ANON_KEY = [Your Supabase anon key]
SUPABASE_SERVICE_ROLE_KEY = [Your Supabase service role key]
JWT_SECRET = [Your JWT secret key - should be 32+ characters]
STRIPE_SECRET_KEY = [Your Stripe secret key]
STRIPE_PUBLISHABLE_KEY = [Your Stripe publishable key]
STRIPE_WEBHOOK_SECRET = [Your Stripe webhook secret]
EMAIL_SERVICE_API_KEY = [Your email service API key]
FRONTEND_URL = https://your-frontend-url.onrender.com
```

**Health Check:**
- Path: `/health`
- This enables Render to monitor your service

### 3. Configure Frontend Service

**Name:** recreational-racketball-frontend

**Settings:**
- Root Directory: `frontend`
- Build Command: `npm install && ng build --configuration=production`
- Start Command: Add a simple Node server in `server.js` (see below)
- Instance Type: Standard (2GB RAM)

**Create server.js in frontend directory:**
```javascript
const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 4200;

// Serve static files from dist directory
app.use(express.static(path.join(__dirname, 'dist/tennis-club-frontend/browser')));

// Redirect all routes to index.html for SPA routing
app.get('/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist/tennis-club-frontend/browser', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Frontend server running on port ${PORT}`);
});
```

**Update frontend/package.json scripts:**
```json
{
  "scripts": {
    "start": "node server.js",
    "build": "ng build --configuration=production"
  }
}
```

**Environment Variables:**
```
NODE_ENV = production
BACKEND_URL = https://your-backend-url.onrender.com/api
```

### 4. Update Environment References

Update your frontend environment files to use the Render backend URL:

**frontend/src/environments/environment.prod.ts:**
```typescript
export const environment = {
  production: true,
  apiUrl: process.env['BACKEND_URL'] || 'https://your-backend-url.onrender.com/api'
};
```

### 5. CORS Configuration

The backend CORS is configured to accept the frontend URL. Update `backend/src/server.ts` if needed:

```typescript
const allowedOrigins: string[] = [
  "http://localhost:4200",
  process.env.FRONTEND_URL || ""
];
```

### 6. Deploy

1. Commit all changes to GitHub:
   ```bash
   git add .
   git commit -m "Add Render deployment configuration"
   git push origin main
   ```

2. Render will automatically deploy when you push to GitHub

3. Monitor the deployment in Render Dashboard:
   - Check backend logs: Dashboard → recreational-racketball-backend → Logs
   - Check frontend logs: Dashboard → recreational-racketball-frontend → Logs

### 7. Verify Deployment

1. Check backend health:
   ```
   https://your-backend-url.onrender.com/health
   ```

2. Check frontend accessibility:
   ```
   https://your-frontend-url.onrender.com
   ```

3. Test API endpoints from frontend to ensure CORS is working

## Troubleshooting

### Backend deployment fails
- Check that `backend/dist/server.js` exists after build
- Verify all dependencies are in `backend/package.json`
- Check MongoDB connection string is correct

### Frontend deployment fails
- Ensure `server.js` is created in frontend directory
- Check that Angular build output path matches `dist/tennis-club-frontend/browser`
- Verify all dependencies are installed

### CORS errors
- Update `FRONTEND_URL` environment variable in backend
- Restart backend service after changing env vars
- Check that frontend URL is added to `allowedOrigins` array

### WebSocket connection issues
- WebSocket runs on same port as HTTP
- Ensure backend is fully deployed before testing
- Check browser console for connection errors

## Custom Domain Setup

1. Go to backend service → Settings → Custom Domain
2. Add your domain and follow DNS instructions
3. Repeat for frontend service

## Monitoring

- **Backend Logs:** Check for database connection issues, API errors
- **Frontend Logs:** Check for build errors, runtime issues
- **Uptime Monitoring:** Enable status page in Render Dashboard

## Rolling Back

If deployment fails:
1. Go to Render Dashboard
2. Select the affected service
3. Click "Deployments" tab
4. Click "Rollback" on the previous successful deployment

## Notes

- Render free tier has limitations (service spins down after 15 min inactivity)
- Consider Pro tier for production use
- Database connections will timeout if idle - implement connection pooling in production
- All environment variables are encrypted at rest in Render

For more help, visit: https://render.com/docs
