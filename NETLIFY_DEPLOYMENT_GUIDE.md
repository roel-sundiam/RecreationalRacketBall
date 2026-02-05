# Netlify Deployment Guide

This guide explains how to deploy the RecreationalRacketBall frontend to Netlify.

## Prerequisites

1. GitHub repository: https://github.com/roel-sundiam/RecreationalRacketBall
2. Netlify account: https://app.netlify.com
3. Backend deployed on Render with URL

## Deployment Steps

### 1. Connect GitHub Repository to Netlify

1. Go to https://app.netlify.com
2. Click "Add new site" → "Import an existing project"
3. Select GitHub as provider
4. Authorize Netlify to access your GitHub account
5. Select `RecreationalRacketBall` repository
6. Click "Deploy site"

### 2. Configure Build Settings

Netlify will auto-detect settings, but verify these:

**Build Settings:**
- Base directory: (leave blank)
- Build command: `npm run build`
- Publish directory: `dist/tennis-club-frontend/browser`

**Node.js Version:**
- Node version: 18.19.0 or higher

### 3. Add Environment Variables

In Netlify Dashboard:

1. Go to your site → **Site settings** → **Environment**
2. Click **Add environment variable**
3. Add the following:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `BACKEND_URL` | Your Render backend URL (e.g., `https://recreational-racketball-backend.onrender.com`) |

### 4. Deploy

1. Netlify automatically deploys when you push to GitHub
2. Go to **Deployments** tab to monitor build progress
3. Once build succeeds, your site is live at `[site-name].netlify.app`

## Configuration Files Included

### netlify.toml
- Defines build command and publish directory
- Configures SPA routing (all routes redirect to index.html)
- Sets up caching headers for assets
- Security headers configured

### frontend/public/_redirects
- Backup SPA routing configuration
- Fallback if netlify.toml isn't processed

### environment.prod.ts
- Uses BACKEND_URL environment variable
- Configured for production build

## Verify Deployment

1. **Check your site:** Visit `https://[your-site].netlify.app`
2. **Test API calls:** Navigate through app and check Network tab for API calls to Render backend
3. **Check browser console:** No CORS errors should appear

## Troubleshooting

### Build fails
- Check build logs in Netlify Dashboard
- Ensure `ng build --configuration=production` works locally: `npm run build`
- Verify all dependencies in frontend/package.json

### App loads but API calls fail
- Check BACKEND_URL environment variable is set correctly
- Verify Render backend is running and accessible
- Check CORS configuration in backend (should allow your Netlify domain)

### Blank page on load
- Check browser console for JavaScript errors
- Verify dist folder contains built files locally
- Check that _redirects file is in dist folder

### SPA routing not working (404 on page refresh)
- netlify.toml is already configured with redirects
- Ensure _redirects file exists in frontend/public folder

## Custom Domain

1. Go to **Site settings** → **Domain management**
2. Click **Add custom domain**
3. Follow DNS instructions for your domain registrar

## SSL/HTTPS

- Netlify automatically provisions free SSL certificates
- HTTPS enabled by default

## Deployment Checklist

- [x] netlify.toml configured
- [x] _redirects file in frontend/public
- [x] environment.prod.ts updated with BACKEND_URL
- [x] GitHub repository connected
- [x] BACKEND_URL environment variable set
- [x] Build command: `npm run build`
- [x] Publish directory: `dist/tennis-club-frontend/browser`

## Redeploy

To redeploy after making changes:

```bash
git add .
git commit -m "Your commit message"
git push origin main
```

Netlify will automatically detect the push and redeploy.

## Useful Links

- Netlify Dashboard: https://app.netlify.com
- Netlify Docs: https://docs.netlify.com
- Angular Build Guide: https://angular.io/guide/build

## Environment Variables for CORS

After deploying, update your Render backend with the frontend URL:

```
FRONTEND_URL=https://your-site.netlify.app
```

Then restart the Render backend service.
