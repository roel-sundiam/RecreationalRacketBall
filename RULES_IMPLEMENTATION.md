# Rules & Regulations - Dynamic Implementation

## Summary

The /rules page has been updated to dynamically fetch club-specific rules from the database instead of displaying static hardcoded content.

## What Was Created

### Backend Changes

1. **Rule Model** (`backend/src/models/Rule.ts`)
   - New MongoDB model for storing rules
   - Fields: title, description, category, icon, order, isActive, details, createdBy, updatedBy
   - Categories: general, payment, cancellation, conduct, court-usage, guest, other
   - Supports multi-club setup (rules filtered by clubId)

2. **Rules API Routes** (`backend/src/routes/rulesRoutes.ts`)
   - `GET /api/rules` - Get all active rules for a club (public, authenticated)
   - `POST /api/rules` - Create a new rule (admin/superadmin only)
   - `GET /api/rules/:id` - Get a specific rule
   - `PATCH /api/rules/:id` - Update a rule (admin/superadmin only)
   - `DELETE /api/rules/:id` - Delete a rule (admin/superadmin only)
   - `PATCH /api/rules/reorder/bulk` - Reorder rules (admin/superadmin only)

3. **Server Registration** (`backend/src/server.ts`)
   - Added rules routes to Express app
   - Mounted at `/api/rules`

4. **Rules Seed Script** (`backend/src/scripts/seedRules.ts`)
   - Initial rules for Villa Gloria Tennis Club
   - 10 comprehensive rules covering:
     - Reservation Policy
     - Member Presence
     - Payment Policy
     - Guest Policy
     - Cancellation Policy
     - Non-Payment Consequences
     - Property Respect
     - Court Etiquette
     - Operating Hours
     - Membership Requirements

### Frontend Changes

1. **Rules Component** (`frontend/src/app/components/rules-and-regulations/rules-and-regulations.component.ts`)
   - Converted from static hardcoded rules to dynamic data fetching
   - Implements OnInit/OnDestroy lifecycle hooks
   - Features:
     - Automatic data fetching from `/api/rules` endpoint
     - Loading state with spinner
     - Error handling with retry button
     - Empty state when no rules available
     - Rules sorted by order (configurable from database)
     - Unsubscribe on component destroy (memory management)

2. **Component Styling** (`frontend/src/app/components/rules-and-regulations/rules-and-regulations.component.scss`)
   - Updated with new loading and error state styles
   - Added animation for fade-in effect
   - Maintained existing responsive design
   - Enhanced visual feedback for user experience

## How It Works

1. **When user navigates to /rules:**
   - Component's `ngOnInit()` is called
   - `loadRules()` method fetches from `/api/rules`
   - Loading spinner displays while fetching

2. **Backend processes request:**
   - Authenticates user (required)
   - Extracts club context from JWT selectedClubId or X-Club-Id header
   - Queries database for rules matching:
     - clubId: req.clubId
     - isActive: true
   - Returns rules sorted by order

3. **Rules display:**
   - Component receives rules and sorts by order field
   - Templates render each rule with icon and details
   - Rule details (sub-items) display as nested list items

## Database Structure

### Rule Document

```typescript
{
  _id: ObjectId,
  clubId: ObjectId,           // Multi-tenant support
  title: String,              // e.g., "Payment Policy"
  description: String,        // Main rule text
  category: String,           // court-usage, payment, etc.
  icon: String,              // Material icon name (e.g., "payment")
  order: Number,             // Display order (0, 1, 2...)
  isActive: Boolean,         // Soft delete support
  details: [String],         // Array of sub-points
  createdBy: ObjectId,       // Admin who created rule
  updatedBy: ObjectId,       // Admin who last updated rule
  createdAt: Date,
  updatedAt: Date
}
```

## Installation Steps

### 1. Rebuild Backend

```bash
cd backend
npm run build
```

### 2. Run Seed Script

```bash
npm run ts-node -- src/scripts/seedRules.ts
```

This populates initial rules for Villa Gloria Tennis Club.

### 3. Restart Backend

```bash
npm start
```

### 4. Frontend Automatic Update

- Component code is already updated
- No additional build required (Angular will hot-reload)
- Navigate to /rules to see dynamic rules

## Multi-Tenant Support

The rules system is fully multi-tenant:

- Rules are scoped to club via `clubId`
- Users from different clubs see only their club's rules
- Admin can manage rules separately per club
- extractClubContext middleware ensures data isolation

## Features

✅ **Dynamic Content** - Rules pulled from database, not hardcoded
✅ **Admin Control** - Can add, edit, delete, reorder rules via API
✅ **Sorting** - Rules ordered by `order` field
✅ **Categories** - Rules organized by type for filtering (future feature)
✅ **Multi-Tenant** - Each club has its own set of rules
✅ **Icon Support** - Each rule has a Material icon for visual identification
✅ **Details List** - Rules can have detailed sub-points
✅ **Soft Delete** - isActive flag supports archiving without deletion
✅ **Audit Trail** - createdBy/updatedBy tracks who manages rules
✅ **Loading States** - Proper UX with loading, error, and empty states

## Future Enhancements

1. Admin panel to manage rules (CRUD UI)
2. Rules filtering by category
3. Rule versioning/history
4. Rule effectiveness metrics
5. Member acknowledgment tracking
6. Rules searchability
7. PDF export of rules
8. Rules change notifications to members

## Testing

Test the implementation:

1. **View Rules:**
   - Navigate to http://localhost:4200/rules
   - Should see loading spinner, then Villa Gloria rules

2. **API Test:**

   ```bash
   curl -H "Authorization: Bearer <token>" http://localhost:3000/api/rules
   ```

3. **Add Test Rule (admin):**
   ```bash
   curl -X POST http://localhost:3000/api/rules \
     -H "Authorization: Bearer <admin_token>" \
     -H "Content-Type: application/json" \
     -d '{
       "title": "Test Rule",
       "description": "This is a test rule",
       "category": "general",
       "icon": "info",
       "order": 11
     }'
   ```
