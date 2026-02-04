# Phase 6: Route Updates Summary

## ✅ Routes Updated with Club Context

### 1. **reservations.ts** - UPDATED
- Added `extractClubContext` middleware after `authenticateToken`
- Changed `requireAdmin` to `requireClubRole(['admin'])`
- Exception: `getMyUpcomingReservations` - no club context (returns all clubs)

### 2. **paymentRoutes.ts** - UPDATED
- Added `extractClubContext` to all payment creation/management routes
- Changed `requireFinancialAccess` / `requireAdmin` to `requireClubRole(['admin', 'treasurer'])`
- Exception: `getMyPayments` - no club context (returns all clubs)
- Exception: `checkMyOverduePayments` - no club context

---

## ⏳ Routes Requiring Update

### Critical (Must be club-scoped):

**3. creditRoutes.ts** - Credit transactions
- Pattern: Add `extractClubContext` after auth
- Queries must filter by `clubId`
- Admin routes use `requireClubRole(['admin', 'treasurer'])`

**4. pollRoutes.ts** - Open Play events
- Pattern: Add `extractClubContext` after auth
- All polls are club-specific
- Admin routes use `requireClubRole(['admin'])`

**5. memberRoutes.ts** - Member management
- Pattern: Add `extractClubContext` for club member lists
- Admin routes use `requireClubRole(['admin'])`
- Some routes may stay platform-level

**6. expenseRoutes.ts** - Club expenses
- Pattern: Add `extractClubContext` after auth
- All expenses are club-specific
- Treasurer/admin routes use `requireClubRole(['admin', 'treasurer'])`

**7. announcementRoutes.ts** - Club announcements
- Pattern: Add `extractClubContext` after auth
- All announcements are club-specific
- Admin routes use `requireClubRole(['admin'])`

**8. suggestions.ts** - Suggestions/complaints
- Pattern: Add `extractClubContext` after auth
- All suggestions are club-specific
- Admin routes use `requireClubRole(['admin'])`

**9. tournamentRoutes.ts** - Tournaments
- Pattern: Add `extractClubContext` after auth
- All tournaments are club-specific
- Admin routes use `requireClubRole(['admin'])`

**10. matchRoutes.ts** - Match results
- Pattern: Add `extractClubContext` after auth
- All matches are club-specific
- Admin routes use `requireClubRole(['admin'])`

**11. galleryRoutes.ts** - Gallery images
- Pattern: Add `extractClubContext` after auth
- All images are club-specific
- Admin routes use `requireClubRole(['admin'])`

**12. chat.ts** - Chat system
- Pattern: Add `extractClubContext` after auth
- Chat rooms are club-specific
- Admin routes use `requireClubRole(['admin'])`

**13. rankingRoutes.ts** - Player rankings
- Pattern: Add `extractClubContext` after auth
- Rankings are club-specific

**14. seedingRoutes.ts** - Seeding points
- Pattern: Add `extractClubContext` after auth
- Seeding is club-specific
- Admin routes use `requireClubRole(['admin'])`

**15. playerRoutes.ts** - Player management
- Pattern: Add `extractClubContext` after auth
- Players are club-specific

---

### Less Critical / Special Cases:

**users.ts** - User management
- Mostly platform-level
- Some routes might need club context for club-specific user data

**analytics.ts** - Analytics
- Could be club-scoped or platform-level
- Decision needed: per-club analytics vs platform analytics

**weatherRoutes.ts** - Weather API
- Public API, no club context needed (uses club coordinates)

**notifications.ts** - Push notifications
- User-specific, may or may not need club context

**impersonation.ts** - Admin impersonation
- Platform admin feature, no club context

**courts.ts** - Court management
- Might be club-specific (if clubs have different courts)
- Or could be generic court booking system

**reportRoutes.ts** - Financial reports
- Should be club-scoped
- Treasurer routes use `requireClubRole(['admin', 'treasurer'])`

---

## 🔧 Standard Update Pattern

For each route file:

```typescript
// 1. Import club middleware
import { extractClubContext, requireClubRole } from '../middleware/club';

// 2. Add after authenticateToken for club-scoped routes
router.use(authenticateToken);
router.use(extractClubContext); // Add this

// 3. Replace requireAdmin with requireClubRole
// OLD:
router.post('/something', requireAdmin, handler);

// NEW:
router.post('/something', requireClubRole(['admin']), handler);

// 4. For treasurer routes:
router.get('/finances', requireClubRole(['admin', 'treasurer']), handler);
```

---

## 📝 Controller Updates Required

After updating routes, each controller must:

1. **Access clubId from request:**
```typescript
const clubId = req.clubId; // Set by extractClubContext middleware
```

2. **Filter all queries by clubId:**
```typescript
// OLD:
const reservations = await Reservation.find({ userId });

// NEW:
const reservations = await Reservation.find({ clubId, userId });
```

3. **Add clubId when creating documents:**
```typescript
// OLD:
const payment = new Payment({ userId, amount, ... });

// NEW:
const payment = new Payment({ clubId, userId, amount, ... });
```

---

## ✅ Verification Checklist

After all updates:

- [ ] All route files import club middleware
- [ ] `extractClubContext` added where needed
- [ ] `requireAdmin` replaced with `requireClubRole(['admin'])`
- [ ] `requireFinancialAccess` replaced with `requireClubRole(['admin', 'treasurer'])`
- [ ] All controllers filter queries by `clubId`
- [ ] All document creation includes `clubId`
- [ ] Test data isolation between clubs
- [ ] Platform admin can still access all clubs

---

## 🚀 Next Steps

1. **Complete remaining route updates** (13 files remaining)
2. **Update all controllers to use clubId**
3. **Test with multiple clubs**
4. **Verify data isolation**

**Estimated Time:** 1-2 hours for all remaining routes + controllers
