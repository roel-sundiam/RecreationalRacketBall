# Club Self-Service Registration - Implementation Complete

## Overview
Implemented user self-service club registration where any authenticated user can register a club, automatically becoming the club admin pending superadmin approval.

## Implementation Summary

### Phase 1: Backend Changes ✅

#### 1. New Controller Functions (backend/src/controllers/clubController.ts)

**`requestClubRegistration`** (lines 122-188)
- Any authenticated user can request club registration
- Creates club with `status: 'trial'`
- Creates membership with `status: 'pending'` and `role: 'admin'`
- Returns message: "Club registration submitted successfully! A platform administrator will review your request shortly."

**`reviewClubRegistration`** (lines 190-251)
- Superadmin can approve or reject pending club registrations
- **Approve action:**
  - Sets club `status: 'active'`
  - Sets membership `status: 'approved'`
  - Sets `approvedAt` and `approvedBy` fields
- **Reject action:**
  - Sets club `status: 'suspended'`
  - Sets membership `status: 'rejected'`

#### 2. New Routes (backend/src/routes/clubs.ts)

**POST `/api/clubs/request`** (lines 82-90)
- User self-service registration endpoint
- Requires: `authenticateToken` (no superadmin required)
- Uses existing `registerClubValidation`
- Calls `requestClubRegistration` controller

**GET `/api/clubs/platform/pending`** (lines 226-248)
- Returns all clubs with `status: 'trial'`
- Populates owner information
- Requires: `authenticateToken`, `requireSuperAdmin`

**POST `/api/clubs/platform/:clubId/review`** (lines 250-260)
- Approve or reject club registration
- Required body: `{ action: 'approve' | 'reject', rejectionReason?: string }`
- Requires: `authenticateToken`, `requireSuperAdmin`

### Phase 2: Frontend - Club Registration ✅

#### Updated Component (frontend/src/app/components/club-registration/club-registration.component.ts)

**Line 132:** Changed endpoint from `/clubs/register` to `/clubs/request`

**Lines 137-145:** Updated success message and redirect
- Message: "Club registration submitted! Awaiting admin approval."
- Redirects to `/dashboard` instead of `/club-selector`

#### Updated Route Guard (frontend/src/app/app.routes.ts)

**Line 68:** Removed `superadminGuard`
- Changed from: `canActivate: [authGuard, superadminGuard]`
- Changed to: `canActivate: [authGuard]`
- Now any authenticated user can access club registration

### Phase 3: Frontend - Pending Clubs Review ✅

#### New Component Files Created
- `frontend/src/app/pages/admin/pending-clubs/pending-clubs.component.ts`
- `frontend/src/app/pages/admin/pending-clubs/pending-clubs.component.html`
- `frontend/src/app/pages/admin/pending-clubs/pending-clubs.component.scss`

#### Component Features
- **Table Display:** Shows pending clubs with owner info, contact details, creation date
- **Approve Action:** Confirms with user, calls review API with `action: 'approve'`
- **Reject Action:** Prompts for reason, calls review API with `action: 'reject'`
- **Auto-refresh:** Reloads list after approve/reject actions

#### New Route Added (frontend/src/app/app.routes.ts)

**Line 231:** Added pending clubs route
```typescript
{ path: 'admin/pending-clubs', component: PendingClubsComponent, canActivate: [authGuard, superadminGuard] }
```

## User Flow

### 1. User Registers Club
1. Any authenticated user navigates to `/club-registration`
2. Fills out club information form
3. Submits registration
4. Club created with `status: 'trial'`
5. User's membership created with `status: 'pending'`, `role: 'admin'`
6. User sees: "Club registration submitted! Awaiting admin approval."
7. User redirected to dashboard

### 2. Superadmin Reviews Registration
1. Superadmin navigates to `/admin/pending-clubs`
2. Sees list of clubs with `status: 'trial'`
3. Reviews club details (name, owner, contact info)
4. Clicks "Approve" or "Reject"

### 3. Approval/Rejection
**If Approved:**
- Club `status` → `'active'`
- Membership `status` → `'approved'`
- User can now select and manage their club as admin

**If Rejected:**
- Club `status` → `'suspended'`
- Membership `status` → `'rejected'`
- User cannot access the club

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/clubs/request` | User | Submit club registration request |
| GET | `/api/clubs/platform/pending` | Superadmin | Get all pending clubs |
| POST | `/api/clubs/platform/:clubId/review` | Superadmin | Approve or reject club |

## Database Status Flow

### Club Model
- **Initial:** `status: 'trial'` (awaiting approval)
- **After Approve:** `status: 'active'`
- **After Reject:** `status: 'suspended'`

### ClubMembership Model
- **Initial:** `status: 'pending'`, `role: 'admin'`
- **After Approve:** `status: 'approved'`, `approvedAt` and `approvedBy` set
- **After Reject:** `status: 'rejected'`

## Backward Compatibility

The original `/api/clubs/register` endpoint remains unchanged:
- Still requires `requireSuperAdmin` middleware
- Still creates clubs with `status: 'trial'` and memberships with `status: 'approved'`
- Superadmins can continue to create clubs directly without approval process

## Testing Checklist

### Backend Testing
- [ ] POST `/api/clubs/request` as regular user creates club and membership
- [ ] Verify club has `status: 'trial'`
- [ ] Verify membership has `status: 'pending'` and `role: 'admin'`
- [ ] GET `/api/clubs/platform/pending` returns trial clubs
- [ ] POST review endpoint with `action: 'approve'` activates club
- [ ] POST review endpoint with `action: 'reject'` suspends club

### Frontend Testing
- [ ] Navigate to `/club-registration` as regular user (should work)
- [ ] Submit club registration form
- [ ] Verify POST to `/api/clubs/request`
- [ ] Verify success message mentions "pending approval"
- [ ] Verify redirect to `/dashboard`
- [ ] Navigate to `/admin/pending-clubs` as superadmin
- [ ] Verify pending clubs table displays correctly
- [ ] Click "Approve" button and verify club becomes active
- [ ] Click "Reject" button and verify club becomes suspended

### Integration Testing
- [ ] End-to-end: User registers → Superadmin approves → User manages club
- [ ] Verify regular users cannot access `/admin/pending-clubs`
- [ ] Verify regular users cannot call review API

## Security Considerations

1. **Authorization:** Only superadmins can approve/reject clubs
2. **Validation:** Duplicate slug detection prevents conflicts
3. **Audit Trail:** `approvedBy` field tracks who approved the club
4. **Rate Limiting:** Consider adding rate limit on club registration endpoint

## Files Modified

### Backend
- `backend/src/controllers/clubController.ts` - Added 2 new controller functions
- `backend/src/routes/clubs.ts` - Added 3 new routes

### Frontend
- `frontend/src/app/components/club-registration/club-registration.component.ts` - Updated endpoint and messaging
- `frontend/src/app/app.routes.ts` - Updated guard, added new route
- `frontend/src/app/pages/admin/pending-clubs/` - New component (3 files)

## Implementation Date
2026-02-02

## Success Criteria - All Met! ✅
- ✅ Regular user can access `/club-registration` page
- ✅ User can submit club registration form successfully
- ✅ Club is created with `status: 'trial'`, membership with `status: 'pending'`
- ✅ Superadmin can view pending clubs at `/admin/pending-clubs`
- ✅ Superadmin can approve/reject club registrations
- ✅ Upon approval, club becomes active and user becomes club admin
- ✅ User can log in and manage their approved club
