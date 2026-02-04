# Rules Page Dynamic Testing Guide

## Overview

The `/rules` page has been successfully updated to fetch rules dynamically from the database instead of using hardcoded content. All backend compilation errors have been resolved and 10 rules have been seeded for Villa Gloria Tennis Club.

## ✅ Completion Status

### Backend

- ✅ Rule model created (`backend/src/models/Rule.ts`)
- ✅ 6 REST endpoints implemented (`backend/src/routes/rulesRoutes.ts`)
  - GET `/api/rules` - List all rules for club
  - POST `/api/rules` - Create new rule (admin only)
  - GET `/api/rules/:id` - Get specific rule
  - PATCH `/api/rules/:id` - Update rule (admin only)
  - DELETE `/api/rules/:id` - Delete rule (admin only)
  - PATCH `/api/rules/reorder/bulk` - Reorder rules (admin only)
- ✅ TypeScript compilation errors fixed (removed superadmin from club-level roles)
- ✅ Backend builds successfully with `npm run build`
- ✅ 10 rules seeded for Villa Gloria Tennis Club via `npm run seed-rules`

### Frontend

- ✅ Rules component refactored to dynamic fetching
- ✅ Component includes loading, error, and empty states
- ✅ No TypeScript compilation errors
- ✅ Multi-tenant scoping via clubId

### Database

- ✅ 10 rules created for Villa Gloria Tennis Club
- ✅ All rules include:
  - Title and description
  - Category (general, payment, cancellation, conduct, court-usage, guest, other)
  - Icon for UI display
  - Order field for sorting
  - Details array (bullet points)
  - Timestamps and audit trails

## Seeded Rules

1. **Reservation Policy** (court-usage)
   - Reservation is on per schedule basis
   - Only members allowed to reserve
   - Details: Schedule info, Members only, Gate control

2. **Member Presence** (conduct)
   - Member must be present
   - Details: Must be at court, No ghost reservations, Gate timing

3. **Payment Policy** (payment)
   - Peak hours: ₱150
   - Off-peak: ₱100
   - Guest: ₱70
   - Details: Payment breakdown, Payment methods

4. **Guest Policy** (guest)
   - Bring guests with proper conduct
   - Details: Guest requirements, Guest fees, Conduct rules

5. **Cancellation Policy** (cancellation)
   - 12-hour advance notice required
   - ₱100 immediate charge if within 12 hours
   - Details: 12-hour notice, Cancellation charges

6. **Non-Payment Consequences** (payment)
   - 3-strike ban system
   - Details: First offense, Second offense, Third offense

7. **Property Respect** (general)
   - No damage to property
   - Details: No vandalism, Keep clean, Report issues

8. **Court Etiquette** (conduct)
   - Respect other players
   - Details: No interruptions, Noise control, Keep clean

9. **Operating Hours** (court-usage)
   - 5AM to 7PM daily
   - Details: Opening hours, Closing procedures

10. **Membership Requirements** (general)
    - Active membership required
    - Details: Active status, Membership verification

## Testing Steps

### 1. Start Backend Server

```bash
cd backend
npm run dev
# or
npm start
```

Backend should be running on `http://localhost:3000`

### 2. Start Frontend Dev Server

```bash
cd frontend
ng serve
# or
npm start
```

Frontend should be running on `http://localhost:4200`

### 3. Test Rules Page

1. Navigate to `http://localhost:4200/rules`
2. You should see:
   - Loading spinner initially
   - 10 rules displayed in order
   - Each rule with icon, title, description
   - Details displayed as bullet points
   - Professional styling with animations

### 4. Verify API Endpoint

**Test directly via curl:**

```bash
# Get all rules (requires authentication)
curl -H "Authorization: Bearer <your-token>" \
  http://localhost:3000/api/rules

# Expected response:
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "title": "Reservation Policy",
      "description": "...",
      "category": "court-usage",
      "icon": "schedule",
      "order": 1,
      "details": [...],
      "clubId": "698164e9330145f863d7f4e3",
      "isActive": true,
      "createdAt": "...",
      "updatedAt": "..."
    },
    ...more rules...
  ]
}
```

### 5. Check Network Tab

1. Open Browser DevTools (F12)
2. Go to Network tab
3. Navigate to `/rules`
4. Look for GET request to `/api/rules`
5. Should return 10 rules with status 200

### 6. Test Admin Functions (Optional)

As an admin user, you can:

**Create new rule:**

```bash
curl -X POST \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "New Rule",
    "description": "Rule description",
    "category": "general",
    "icon": "info",
    "order": 11
  }' \
  http://localhost:3000/api/rules
```

**Update rule:**

```bash
curl -X PATCH \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"title": "Updated Title"}' \
  http://localhost:3000/api/rules/<rule-id>
```

**Delete rule:**

```bash
curl -X DELETE \
  -H "Authorization: Bearer <admin-token>" \
  http://localhost:3000/api/rules/<rule-id>
```

## Multi-Tenant Support

- All rules are filtered by `clubId`
- Users only see rules for their club
- Admin endpoints require club admin role
- Rules endpoint: `/api/rules` (authenticated, club-scoped)

## Key Files Modified

1. **backend/src/models/Rule.ts** (NEW)
   - MongoDB schema for rules
   - Validation and static methods

2. **backend/src/routes/rulesRoutes.ts** (NEW)
   - All 6 REST endpoints
   - Middleware: authenticateToken → extractClubContext → requireClubRole

3. **backend/src/server.ts** (MODIFIED)
   - Added rulesRoutes import
   - Registered routes at `/api/rules`

4. **backend/src/scripts/seedRules.ts** (NEW)
   - Seeds 10 rules for Villa Gloria
   - Run with: `npm run seed-rules`

5. **backend/package.json** (MODIFIED)
   - Added `seed-rules` script

6. **frontend/src/app/components/rules-and-regulations/rules-and-regulations.component.ts** (MODIFIED)
   - Converted from static to dynamic
   - Fetches from `/api/rules`
   - Implements loading/error/empty states

7. **frontend/src/app/components/rules-and-regulations/rules-and-regulations.component.scss** (MODIFIED)
   - Updated styling for dynamic content
   - Added loading, error, empty state styles
   - Added animations

## Troubleshooting

### Backend won't compile

```bash
cd backend
npm run build
```

If errors appear, check TypeScript errors in `src/routes/rulesRoutes.ts`

### No rules displaying

1. Check if seed script ran: `npm run seed-rules`
2. Verify MongoDB connection in backend logs
3. Check browser Network tab for API errors
4. Verify authentication token is valid

### API returns 401 Unauthorized

- Make sure you're logged in
- Frontend automatically handles auth via AuthService
- Check token in browser localStorage

### API returns 403 Forbidden

- Ensure you have club context set
- Check if user is member of the club
- For write operations, ensure user is admin

### Rules not in correct order

- Backend returns rules sorted by `order` field
- If order looks wrong, check database directly or re-run seed script

## Performance Notes

- GET `/api/rules` returns all rules (typically 10-20 per club)
- Frontend caches in component property `rules: Rule[]`
- No additional queries needed for display
- Consider adding pagination if clubs have 100+ rules

## Future Enhancements

- Add rule categories filter on UI
- Add search functionality
- Add rule version history
- Add rule effectiveness ratings
- Add rule comments/feedback system
- Add bulk operations UI
- Add rule templates for new clubs
