# How to Clear Browser Cache and Fix Login Issue

## The Problem
Your user account is approved in the database, but old JWT tokens are causing "Account pending approval" errors.

## Solution: Complete Browser Reset

### Option 1: Clear Everything (Recommended)
1. **Open DevTools** (F12 or Right-click > Inspect)
2. **Go to Application tab**
3. **Clear Storage** (left sidebar)
4. **Check all boxes:**
   - Local storage
   - Session storage
   - IndexedDB
   - Cookies
5. **Click "Clear site data"**
6. **Hard Refresh:** Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
7. **Log in again**

### Option 2: Manual localStorage Clear
1. **Open DevTools Console** (F12)
2. **Run these commands:**
   ```javascript
   localStorage.clear();
   sessionStorage.clear();
   location.reload(true);
   ```
3. **Log in again**

### Option 3: Incognito/Private Window
1. Open a **new Incognito/Private window**
2. Navigate to http://localhost:4200
3. Log in with `roelsundiam`

## Why This Happens
- Old JWT token was generated when account was not approved
- Browser cached the invalid token
- Need fresh token with current approval status

## After Clearing
You should have full access to:
- Browse clubs
- Select Suburbia club  
- Admin dashboard
- All admin features
