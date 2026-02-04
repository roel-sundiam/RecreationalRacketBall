# Phase 10: Route Guards and Routing Updates

## ✅ Completed

Updated routing configuration and created new guards for multi-tenant club access control.

---

## 1. New Route Guards Created

**Location:** `frontend/src/app/guards/auth.guard.ts`

### clubSelectionGuard

**Purpose:** Ensures user has selected a club before accessing club-specific routes

**Logic:**
1. Check if user is authenticated → redirect to `/login` if not
2. Check if user has selected a club → allow access if yes
3. Check if user has approved clubs → redirect to `/club-selector`
4. User has no clubs → redirect to `/club-selector` (shows "no clubs" message)

**Usage:**
```typescript
canActivate: [authGuard, clubSelectionGuard]
```

### clubAdminGuard

**Purpose:** Requires selected club AND admin/treasurer role in that club

**Logic:**
1. Check if user is authenticated → redirect to `/login` if not
2. Check if user has selected a club → redirect to `/club-selector` if not
3. Check if user is club admin/treasurer OR platform admin → allow access
4. Not authorized → redirect to `/dashboard`

**Usage:**
```typescript
canActivate: [authGuard, clubSelectionGuard, clubAdminGuard]
```

---

## 2. New Routes Added

### Club Management Routes

```typescript
{
  path: 'club-selector',
  component: ClubSelectorComponent,
  canActivate: [authGuard]
}

{
  path: 'club-registration',
  component: ClubRegistrationComponent,
  canActivate: [authGuard]
}
```

**Note:** These routes require authentication but NOT club selection (chicken-and-egg problem)

---

## 3. Updated Existing Routes

All routes updated to include `clubSelectionGuard` except:
- `/login` - Not authenticated
- `/register` - Not authenticated
- `/club-selector` - Club selection page itself
- `/club-registration` - Used to create clubs
- `/profile` - User profile (club-independent)

### Routes Requiring Club Selection (Examples)

```typescript
// Main navigation
{ path: 'dashboard', canActivate: [authGuard, clubSelectionGuard] }
{ path: 'calendar', canActivate: [authGuard, clubSelectionGuard] }
{ path: 'reservations', canActivate: [authGuard, clubSelectionGuard] }
{ path: 'payments', canActivate: [authGuard, clubSelectionGuard] }
{ path: 'members', canActivate: [authGuard, clubSelectionGuard] }

// Member features
{ path: 'polls', canActivate: [authGuard, clubSelectionGuard] }
{ path: 'rankings', canActivate: [authGuard, clubSelectionGuard] }
{ path: 'weather', canActivate: [authGuard, clubSelectionGuard] }
{ path: 'suggestions', canActivate: [authGuard, clubSelectionGuard] }
{ path: 'credits', canActivate: [authGuard, clubSelectionGuard] }
```

### Admin Routes Updated to Use clubAdminGuard

```typescript
// Club admin routes (previously used adminGuard)
{ path: 'admin/members', canActivate: [authGuard, clubSelectionGuard, clubAdminGuard] }
{ path: 'admin/polls', canActivate: [authGuard, clubSelectionGuard, clubAdminGuard] }
{ path: 'admin/suggestions', canActivate: [authGuard, clubSelectionGuard, clubAdminGuard] }
{ path: 'admin/analytics', canActivate: [authGuard, clubSelectionGuard, clubAdminGuard] }
{ path: 'admin/block-court', canActivate: [authGuard, clubSelectionGuard, clubAdminGuard] }
{ path: 'admin/tournaments', canActivate: [authGuard, clubSelectionGuard, clubAdminGuard] }
{ path: 'admin/payments', canActivate: [authGuard, clubSelectionGuard, clubAdminGuard] }
{ path: 'admin/resurfacing-contributions', canActivate: [authGuard, clubSelectionGuard, clubAdminGuard] }
{ path: 'admin/expense-report', canActivate: [authGuard, clubSelectionGuard, clubAdminGuard] }
{ path: 'admin/credits', canActivate: [authGuard, clubSelectionGuard, clubAdminGuard] }
```

### Routes Kept with Original Guards

```typescript
// Platform admin only (superadminGuard)
{ path: 'admin/manual-court-usage', canActivate: [authGuard, clubSelectionGuard, superadminGuard] }
{ path: 'admin/announcements', canActivate: [authGuard, clubSelectionGuard, superadminGuard] }
{ path: 'admin/gallery-upload', canActivate: [authGuard, clubSelectionGuard, superadminGuard] }

// Treasurer access (treasurerGuard)
{ path: 'admin/reports', canActivate: [authGuard, clubSelectionGuard, treasurerGuard] }
{ path: 'admin/financial-report', canActivate: [authGuard, clubSelectionGuard, treasurerGuard] }
{ path: 'admin/membership-payments', canActivate: [authGuard, clubSelectionGuard, treasurerGuard] }
```

---

## 4. Guard Execution Order

Guards execute in array order, so we always use this pattern:

```typescript
canActivate: [authGuard, clubSelectionGuard, roleGuard]
```

**Execution Flow:**
1. `authGuard` - Check authentication
2. `clubSelectionGuard` - Check club selection
3. Role guard (`clubAdminGuard`, `treasurerGuard`, etc.) - Check permissions

---

## 5. Navigation Flow

### First-Time User Flow
1. Register → Login
2. Auto-redirected to `/club-selector` (no clubs)
3. Click "Create Club" → `/club-registration`
4. Submit form → Create club → Redirect to `/club-selector`
5. Select club → Navigate to `/dashboard`

### Existing User (Single Club)
1. Login → Club auto-selected
2. Navigate to `/calendar` (or last route)
3. All features accessible immediately

### Multi-Club User
1. Login → First approved club auto-selected
2. Can switch clubs via toolbar switcher
3. Page reloads with new club context

### User Without Selected Club
1. Try to access `/reservations`
2. `clubSelectionGuard` catches → Redirect to `/club-selector`
3. Select club → Redirect back to intended route

---

## 6. Backward Compatibility

### Old Role System Still Works
The guards check BOTH old and new role systems:

```typescript
// clubAdminGuard checks:
authService.isClubAdmin()  // New: checks club-specific role
authService.isPlatformAdmin()  // New: platform admin
authService.isAdmin()  // Old: fallback to user.role
```

### Single-Club Installations
- Backend migration creates one club
- All users auto-assigned to that club
- Club auto-selected on login
- Works exactly as before (no UX change)

---

## 7. Testing Checklist

### Guard Functionality
- [ ] `clubSelectionGuard` redirects to `/club-selector` when no club selected
- [ ] `clubSelectionGuard` allows access when club is selected
- [ ] `clubAdminGuard` blocks non-admin users
- [ ] `clubAdminGuard` allows club admins and platform admins
- [ ] Platform admin can access all club admin routes
- [ ] Regular member cannot access admin routes

### Navigation Flows
- [ ] Login with no clubs → redirected to club-selector
- [ ] Login with single club → auto-selected, normal navigation
- [ ] Login with multiple clubs → auto-selects first, can switch
- [ ] Create new club → appears in club list
- [ ] Switch clubs → page reloads, data updates
- [ ] Direct URL access to admin route → blocked if not admin

### Routes
- [ ] `/club-selector` accessible to authenticated users
- [ ] `/club-registration` accessible to authenticated users
- [ ] `/dashboard` requires club selection
- [ ] `/admin/members` requires club selection and admin role
- [ ] `/profile` accessible without club selection
- [ ] 404 redirects to `/calendar`

---

## Summary of Changes

**Files Modified:**
1. `frontend/src/app/guards/auth.guard.ts`
   - Added `clubSelectionGuard`
   - Added `clubAdminGuard`

2. `frontend/src/app/app.routes.ts`
   - Added club-selector and club-registration routes
   - Added `clubSelectionGuard` to all club-specific routes
   - Updated admin routes to use `clubAdminGuard`
   - Imported new components and guards

**Total Routes Updated:** 35+ routes
**New Guards:** 2 guards
**New Routes:** 2 routes

---

## Next Steps

**Phase 11:** Test and verify multi-tenant implementation
- Run migration script on database
- Test club creation and selection
- Verify data isolation between clubs
- Test club switching functionality
- Verify admin permissions per club
- Test all navigation flows
- Performance testing with multiple clubs
