# Remaining Route Updates - Batch Instructions

## ✅ Completed (4/15)
1. reservations.ts
2. paymentRoutes.ts
3. creditRoutes.ts
4. pollRoutes.ts

## ⏳ Remaining (11/15)

For each remaining route, apply these standard patterns:

### Pattern A: Simple Club-Scoped Routes
**Files:** expenseRoutes.ts, announcementRoutes.ts, suggestions.ts, galleryRoutes.ts

**Changes:**
```typescript
// 1. Add import
import { extractClubContext, requireClubRole } from '../middleware/club';

// 2. Add after authenticateToken
router.use(authenticateToken);
router.use(extractClubContext);

// 3. Replace admin checks
// OLD: requireRole(['admin', 'superadmin'])
// NEW: requireClubRole(['admin'])

// OLD: requireFinancialAccess
// NEW: requireClubRole(['admin', 'treasurer'])
```

### Pattern B: Tournament/Match Routes
**Files:** tournamentRoutes.ts, matchRoutes.ts, seedingRoutes.ts, rankingRoutes.ts, playerRoutes.ts

**Changes:** Same as Pattern A

### Pattern C: Chat Routes
**File:** chat.ts

**Changes:** Same as Pattern A, chat rooms are club-specific

### Pattern D: Member Routes
**File:** memberRoutes.ts

**Special:** Some routes might be platform-level (user management), others club-specific (club member list)

**Approach:**
- Club member list routes: Add `extractClubContext`
- Platform user management: Keep as-is or use platform admin checks

---

## Quick Reference for Each File:

### 5. expenseRoutes.ts
- Add: `import { extractClubContext, requireClubRole } from '../middleware/club';`
- After auth: `router.use(extractClubContext);`
- Replace: `requireFinancialAccess` → `requireClubRole(['admin', 'treasurer'])`
- Replace: `requireAdmin` → `requireClubRole(['admin'])`

### 6. announcementRoutes.ts
- Add: `import { extractClubContext, requireClubRole } from '../middleware/club';`
- After auth: `router.use(extractClubContext);`
- Replace: `requireAdmin` → `requireClubRole(['admin'])`

### 7. suggestions.ts
- Add: `import { extractClubContext, requireClubRole } from '../middleware/club';`
- After auth: `router.use(extractClubContext);`
- Replace: `requireRole(['admin', 'superadmin'])` → `requireClubRole(['admin'])`

### 8. tournamentRoutes.ts
- Add: `import { extractClubContext, requireClubRole } from '../middleware/club';`
- After auth: `router.use(extractClubContext);`
- Replace: `requireRole(['admin', 'superadmin'])` → `requireClubRole(['admin'])`

### 9. matchRoutes.ts
- Add: `import { extractClubContext, requireClubRole } from '../middleware/club';`
- After auth: `router.use(extractClubContext);`
- Replace: `requireRole(['admin', 'superadmin'])` → `requireClubRole(['admin'])`

### 10. galleryRoutes.ts
- Add: `import { extractClubContext, requireClubRole } from '../middleware/club';`
- After auth: `router.use(extractClubContext);`
- Public view routes: Keep public (no club context)
- Upload/admin routes: Add `requireClubRole(['admin'])`

### 11. chat.ts
- Add: `import { extractClubContext, requireClubRole } from '../middleware/club';`
- After auth: `router.use(extractClubContext);`
- Admin routes: `requireClubRole(['admin'])`

### 12. rankingRoutes.ts
- Add: `import { extractClubContext, requireClubRole } from '../middleware/club';`
- After auth: `router.use(extractClubContext);`
- All routes club-scoped

### 13. seedingRoutes.ts
- Add: `import { extractClubContext, requireClubRole } from '../middleware/club';`
- After auth: `router.use(extractClubContext);`
- Replace: `requireAdmin` → `requireClubRole(['admin'])`

### 14. playerRoutes.ts
- Add: `import { extractClubContext, requireClubRole } from '../middleware/club';`
- After auth: `router.use(extractClubContext);`
- All routes club-scoped

### 15. memberRoutes.ts
- **Complex:** Mix of club and platform routes
- Club member list: Add `extractClubContext`
- User approval: May need platform admin
- **Review each route individually**

---

## After Route Updates Complete:

### Next: Controller Updates

For EACH controller, update queries:

```typescript
// OLD:
const items = await Model.find({ userId });

// NEW:
const items = await Model.find({ clubId: req.clubId, userId });

// OLD:
const item = new Model({ userId, data });

// NEW:
const item = new Model({ clubId: req.clubId, userId, data });
```

**Controllers to Update:**
- reservationController.ts
- paymentController.ts
- creditController.ts
- pollController.ts
- expenseController.ts
- announcementController.ts
- suggestionController.ts
- tournamentController.ts
- matchController.ts
- galleryController.ts
- chatController.ts
- rankingController.ts
- seedingController.ts
- playerController.ts
- memberController.ts (partially)

---

## Verification Steps:

1. **Compile TypeScript:**
```bash
cd backend && npm run build
```

2. **Start Server:**
```bash
npm run dev
```

3. **Test with Superadmin:**
- Login as superadmin
- Should have club context
- Test creating reservation/payment

4. **Test Data Isolation:**
- Create second club
- Create test user in second club
- Verify cannot see first club's data

---

## Estimated Time:
- Route updates: 30-45 minutes (mechanical, following patterns)
- Controller updates: 1-2 hours (need to review each query)
- Testing: 30 minutes

**Total: ~2-3 hours**
