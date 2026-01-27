# Tennis Club → Play Squad Auto-Login Integration

## Implementation Summary

Auto-login integration successfully implemented between Tennis Club RT2 and Play Squad. Users can now click "Open Play" in Tennis Club and be automatically logged into Play Squad.

## Files Modified

### Tennis Club RT2
- ✅ `frontend/src/app/shared/toolbar/toolbar.component.ts` - Modified `openPlayClick()` method

### Play Squad Backend
- ✅ `backend/src/models/User.js` - Added Tennis Club reference fields
- ✅ `backend/src/routes/auth.js` - Added `/api/auth/tennis-club-login` endpoint

### Play Squad Frontend
- ✅ `frontend/src/app/services/auth.service.ts` - Added `tennisClubLogin()` method
- ✅ `frontend/src/app/app.component.ts` - Added URL parameter handler

## How It Works

### User Flow
1. User logs into Tennis Club RT2
2. User clicks "Open Play" button in toolbar
3. Tennis Club encodes user data as base64 JSON in URL parameter
4. Play Squad receives URL with `?auth=<encoded_data>`
5. Play Squad decodes auth data and calls backend auto-login endpoint
6. Backend creates/updates user and returns JWT token
7. User is automatically logged into Play Squad
8. User is redirected to Play Squad dashboard

### Auth Parameter Format
```typescript
// Encoded data structure
{
  username: string;      // Tennis Club username
  email: string;         // User email
  fullName: string;      // Display name
  userId: string;        // Tennis Club MongoDB _id
  role: string;          // 'member' | 'admin' | 'superadmin' | 'treasurer'
}

// URL format
https://play-squad.netlify.app/?auth=<base64_encoded_json>
```

## Testing Steps

### Prerequisites
Start all required services:

```bash
# Terminal 1: Tennis Club Backend
cd /mnt/c/Projects2/TennisClubRT2-Production/backend
npm run dev

# Terminal 2: Tennis Club Frontend
cd /mnt/c/Projects2/TennisClubRT2-Production/frontend
ng serve

# Terminal 3: Play Squad Backend
cd /mnt/c/Projects2/PlaySquad/backend
npm run dev

# Terminal 4: Play Squad Frontend (use different port for testing)
cd /mnt/c/Projects2/PlaySquad/frontend
ng serve --port 4201
```

### IMPORTANT: Update Play Squad URL for Local Testing

**Before testing locally, update the Play Squad URL in Tennis Club toolbar:**

Edit `frontend/src/app/shared/toolbar/toolbar.component.ts` line ~325:
```typescript
// Change from:
const playSquadUrl = `https://play-squad.netlify.app/?auth=${encodeURIComponent(authToken)}`;

// To (for local testing):
const playSquadUrl = `http://localhost:4201/?auth=${encodeURIComponent(authToken)}`;
```

**Remember to change it back to production URL before deploying!**

### Test 1: Desktop Auto-Login Flow
1. Open Tennis Club: http://localhost:4200
2. Log in as test user: `RoelSundiam` / `RT2Tennis`
3. Click "Open Play" button in desktop toolbar
4. **Expected Results:**
   - New tab opens to Play Squad (localhost:4201)
   - Console shows: "🎾 Tennis Club auth parameter detected"
   - Console shows: "✅ Auto-login successful"
   - User is redirected to Play Squad dashboard
   - User info displayed correctly in Play Squad

### Test 2: Mobile Auto-Login Flow
1. Open Tennis Club in responsive mode or mobile device
2. Log in as test user
3. Open mobile menu (hamburger icon)
4. Click "Open Play"
5. **Expected Results:**
   - Redirects to Play Squad in same window
   - Mobile menu closes
   - Auto-login happens
   - Redirected to Play Squad dashboard

### Test 3: First-Time User Creation
1. Log in to Tennis Club as a user who has NEVER logged into Play Squad
2. Click "Open Play"
3. **Expected Results:**
   - Play Squad creates new user in its database
   - User logged in automatically
   - Check Play Squad MongoDB to verify new user created with Tennis Club fields

### Test 4: Returning User Flow
1. Log out of Play Squad
2. Go back to Tennis Club
3. Click "Open Play" again
4. **Expected Results:**
   - Play Squad finds existing user by email
   - NO duplicate user created
   - Auto-login happens
   - Redirected to dashboard

### Test 5: URL Parameter Inspection
1. Click "Open Play" from Tennis Club
2. Before Play Squad redirects, quickly inspect the URL
3. Open browser console and run:
   ```javascript
   const params = new URLSearchParams(window.location.search);
   const authData = JSON.parse(atob(params.get('auth')));
   console.log(authData);
   ```
4. **Expected Output:**
   ```javascript
   {
     username: "RoelSundiam",
     email: "roel@example.com",
     fullName: "Roel Sundiam",
     userId: "65a7f8b43f24a1234567890",
     role: "member"
   }
   ```

### Test 6: Different User Roles
Test with different user roles:
- Member: `RoelSundiam` / `RT2Tennis`
- Admin: Create test admin account
- Superadmin: `superadmin` / `admin123`

Verify all user data passed correctly.

### Test 7: Error Handling
Test error scenarios:

**Invalid auth parameter:**
1. Navigate to: `http://localhost:4201/?auth=invalid`
2. **Expected:** Error logged, redirect to login page

**Malformed JSON:**
1. Navigate with valid base64 but invalid JSON
2. **Expected:** Error caught, redirect to login page

**Backend offline:**
1. Kill Play Squad backend
2. Click "Open Play" from Tennis Club
3. **Expected:** Error in console, redirect to login page

### Test 8: Database Verification

**Check Play Squad MongoDB:**
```javascript
// Connect to Play Squad database
use playsquad_db

// Find user created from Tennis Club
db.users.findOne({ email: "roel@example.com" })

// Verify fields:
// - tennisClubUserId: Should match Tennis Club user _id
// - tennisClubUsername: Should be "RoelSundiam"
// - tennisClubRole: Should be "member"
```

### Test 9: Analytics Tracking
1. Open browser DevTools → Console
2. Click "Open Play"
3. **Expected:** Analytics event logged:
   ```
   Button Click: Open Play (Play Squad)
   Location: toolbar
   Metadata: { platform: 'desktop', userId: '<user_id>' }
   ```

### Test 10: Production Testing (After Deployment)

**Before deploying, revert Play Squad URL to production:**
```typescript
const playSquadUrl = `https://play-squad.netlify.app/?auth=${encodeURIComponent(authToken)}`;
```

1. Deploy Play Squad to Netlify
2. Deploy Tennis Club (if needed)
3. Test from live Tennis Club to live Play Squad
4. Verify CORS configuration allows cross-origin requests
5. Verify HTTPS works correctly

## Verification Checklist

- [ ] Tennis Club "Open Play" button opens Play Squad URL
- [ ] Auth parameter is correctly encoded in URL
- [ ] Play Squad decodes auth parameter successfully
- [ ] New users are created in Play Squad database
- [ ] Existing users are logged in (no duplicates)
- [ ] Tennis Club reference fields are populated
- [ ] JWT token is stored in localStorage
- [ ] User is redirected to Play Squad dashboard
- [ ] Auth parameter is removed from URL after login
- [ ] Analytics tracking works correctly
- [ ] Mobile flow works (menu closes, redirects)
- [ ] Error handling works (invalid params, backend offline)
- [ ] Multiple users can auto-login without conflicts

## Rollback Instructions

### Tennis Club Rollback
If issues arise, revert `toolbar.component.ts`:
```bash
cd /mnt/c/Projects2/TennisClubRT2-Production
git checkout frontend/src/app/shared/toolbar/toolbar.component.ts
```

Original Reclub code is commented out in the file for reference.

### Play Squad Rollback
1. **Backend:** Remove tennis-club-login endpoint (existing users not affected)
2. **Frontend:** Remove handleTennisClubAuth() from app.component.ts
3. **Database:** No rollback needed (Tennis Club fields are optional)

## Database Schema Changes

### Play Squad User Model - New Fields
```typescript
tennisClubUserId: String (indexed)
tennisClubUsername: String
tennisClubRole: String (enum)
```

These fields are OPTIONAL and won't affect existing Play Squad users.

## Security Notes

### Current Implementation
- User data encoded as base64 (visible in URL)
- No signature verification
- Anyone with correct data format could craft URL

### Recommended Future Enhancements
1. **Add signature verification** - Sign auth token with shared secret
2. **Use one-time tokens** - Token expires after first use or 60 seconds
3. **Consider OAuth flow** - Tennis Club acts as OAuth provider

### CORS Configuration
Play Squad backend must allow Tennis Club origin:
```javascript
const allowedOrigins = [
  'http://localhost:4200',  // Tennis Club dev
  'http://localhost:4201',  // Play Squad dev
  'https://tennisclubrt2-december.onrender.com',  // Tennis Club production
];
```

## API Endpoint Documentation

### POST /api/auth/tennis-club-login

**Description:** Auto-login endpoint for Tennis Club users

**Request Body:**
```json
{
  "username": "RoelSundiam",
  "email": "roel@example.com",
  "fullName": "Roel Sundiam",
  "userId": "65a7f8b43f24a1234567890",
  "role": "member"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "firstName": "Roel",
    "lastName": "Sundiam",
    "email": "roel@example.com",
    "avatar": null,
    "skillLevel": 5,
    "preferredFormat": "any",
    "clubs": [],
    "stats": {
      "gamesPlayed": 0,
      "wins": 0,
      "losses": 0
    }
  }
}
```

**Response (Error - 400):**
```json
{
  "success": false,
  "message": "Validation errors",
  "errors": [...]
}
```

**Response (Error - 500):**
```json
{
  "success": false,
  "message": "Server error during Tennis Club login"
}
```

## Troubleshooting

### Issue: "No user logged in" error
**Solution:** Ensure user is authenticated in Tennis Club before clicking "Open Play"

### Issue: Play Squad not loading
**Solution:** Check Play Squad backend is running on port 3000

### Issue: CORS errors
**Solution:** Verify Tennis Club URL is in Play Squad CORS allowed origins

### Issue: User not auto-logged in
**Solution:** Check browser console for errors, verify auth parameter format

### Issue: Duplicate users created
**Solution:** Check email matching logic in tennis-club-login endpoint

### Issue: Auth parameter visible in URL
**Solution:** This is expected - parameter is removed after successful login

## Contact & Support

For issues or questions about this integration:
1. Check this documentation first
2. Review browser console logs
3. Check backend logs for errors
4. Verify all services are running correctly

## Changelog

### 2026-01-27 - Initial Implementation
- Implemented Tennis Club → Play Squad auto-login
- Added Tennis Club reference fields to Play Squad User model
- Created tennis-club-login backend endpoint
- Added URL parameter handler to Play Squad frontend
- Updated Tennis Club toolbar to pass auth data
