# Multi-Tenant Platform - Quick Start Guide

## 🚀 Getting Started

Your tennis club app is now a multi-tenant SaaS platform! Here's how to get it running.

---

## Step 1: Run Database Migration

**IMPORTANT:** This must be done before starting the app.

```bash
cd backend
npm run migrate-to-multitenant
```

**What this does:**
- Creates default "Rich Town 2 Tennis Club"
- Migrates all existing users
- Adds clubId to all existing data
- Updates database indexes

**Expected output:**
```
✅ Migration completed successfully!
📊 Summary:
   - Clubs created: 1
   - Users migrated: XX
   - Documents updated: XXX
```

---

## Step 2: Start the Backend

```bash
cd backend
npm run dev
```

**Expected output:**
```
📥 Registering API routes...
✅ Connected to MongoDB: RecreationalRacketBall
🚀 Server running on port 3000
```

**Verify it's working:**
```bash
curl http://localhost:3000/api/health
```

Should return: `{"status":"OK","database":"RecreationalRacketBall",...}`

---

## Step 3: Start the Frontend

```bash
cd frontend
ng serve
```

**Expected output:**
```
✔ Browser application bundle generation complete.
** Angular Live Development Server is listening on localhost:4200
✔ Compiled successfully
```

**Open in browser:** http://localhost:4200

---

## Step 4: Test the System

### Test 1: Existing User Login
1. Login with existing user (e.g., RoelSundiam/RT2Tennis)
2. You should see:
   - Club automatically selected
   - Club name in toolbar (top right before user name)
   - Everything works as before

### Test 2: Create New Club
1. Click club name in toolbar
2. Click "View All Clubs"
3. Click "Create New Club"
4. Fill out the form:
   - **Name:** "My Test Tennis Club"
   - **Contact Email:** your@email.com
   - **Contact Phone:** +1 234 567 8900
   - **Address:** Fill in any address
   - **Coordinates:** Click "Detect Current Location" or enter manually
5. Submit
6. You should see your new club in the selector
7. Click to select it
8. Navigate around - you'll have empty data (no members, reservations, etc.)

### Test 3: Switch Clubs
1. Click club name in toolbar
2. Select different club from dropdown
3. Page should reload
4. All data should change to the selected club

### Test 4: Check Network Requests
1. Open DevTools → Network tab
2. Navigate to any page (e.g., /reservations)
3. Look at API requests
4. You should see header: `X-Club-Id: [club-id]`

---

## Common Issues & Solutions

### Issue: "Cannot find club routes"
**Solution:** Make sure `/api/clubs` routes are registered in server.ts (line 211)

### Issue: CORS error with X-Club-Id header
**Solution:** Restart backend after CORS update (server.ts was updated)

### Issue: "No club selected" redirect loop
**Solution:**
1. Clear localStorage: `localStorage.clear()`
2. Logout and login again
3. Check that user has at least one approved club

### Issue: Migration script fails
**Solution:**
1. Check MongoDB connection
2. Verify at least one superadmin user exists
3. Check console for specific error

### Issue: Club switcher not visible
**Solution:**
1. Restart frontend (`ng serve`)
2. Clear browser cache
3. Check toolbar.component.ts imports

---

## Quick Reference

### API Endpoints
```
POST   /api/clubs/register          - Create new club
GET    /api/clubs/search            - Search clubs (public)
GET    /api/club/current/settings   - Get current club settings
PATCH  /api/club/current/settings   - Update club settings (admin)
PATCH  /api/club/current/branding   - Update club branding (admin)
```

### Frontend Routes
```
/club-selector          - Select from user's clubs
/club-registration      - Create new club
/dashboard              - Main dashboard (requires club)
/reservations           - Court reservations (requires club)
/admin/members          - Member management (requires club admin)
```

### LocalStorage Keys
```
token                   - JWT authentication token
user                    - Current user object
clubs                   - User's club memberships
selectedClub            - Currently selected club
```

---

## User Roles

### Platform Roles
- **user** (default) - Regular platform user
- **platform_admin** - Can access all clubs, all admin features

### Club Roles
- **member** (default) - Regular club member
- **admin** - Can manage club settings, members, etc.
- **treasurer** - Has financial access + admin privileges

**Note:** Platform admins have admin privileges in ALL clubs.

---

## Testing Checklist

Quick verification that everything works:

- [ ] Login with existing user
- [ ] Club auto-selected on login
- [ ] Club name visible in toolbar
- [ ] Can create new club
- [ ] Can switch between clubs
- [ ] Page reloads when switching
- [ ] Different data for each club
- [ ] X-Club-Id header in API requests
- [ ] Admin features work per club
- [ ] Mobile menu shows club switcher

---

## Need Help?

### Check the Documentation
1. `MULTITENANT_IMPLEMENTATION_COMPLETE.md` - Complete overview
2. `PHASE11_TESTING_COMPLETE.md` - Detailed testing guide
3. `FRONTEND_MULTITENANT_COMPLETE.md` - Frontend architecture
4. Individual phase docs for specific details

### Common Questions

**Q: Can users create unlimited clubs?**
A: Yes, currently there's no limit. You can add restrictions later.

**Q: How do I make someone a platform admin?**
A: Update their user record in MongoDB: `platformRole: 'platform_admin'`

**Q: Can I delete a club?**
A: Not implemented yet. You can suspend it by updating status to 'suspended'.

**Q: How do I change club settings?**
A: As club admin, call `PATCH /api/club/current/settings`

**Q: Can users be in multiple clubs?**
A: Yes! That's the whole point of multi-tenant. They switch via the toolbar.

---

## Next Steps

1. **Test thoroughly** using the testing checklist
2. **Create test clubs** to verify data isolation
3. **Test admin features** in each club
4. **Verify mobile experience**
5. **Prepare for production deployment**

---

## Production Deployment

When ready to deploy:

1. **Backup database**
2. **Run migration on production database**
3. **Update environment variables**
4. **Deploy backend**
5. **Build and deploy frontend** (`ng build`)
6. **Test all critical paths**
7. **Monitor logs for errors**

See `PHASE11_TESTING_COMPLETE.md` for full deployment checklist.

---

## 🎉 You're Ready!

Your multi-tenant tennis club platform is complete and ready to serve unlimited clubs!

**Happy clubbing! 🎾**
