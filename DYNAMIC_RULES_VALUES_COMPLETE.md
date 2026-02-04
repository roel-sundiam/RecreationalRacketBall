# Dynamic Rules Values Implementation ✅

## What Was Done

You now have **truly dynamic rules** where the actual values (fees, operating hours, etc.) are pulled from the database and automatically injected into the rule text.

### Example Transformation

**Before (Hardcoded):**

```
Payment Policy
"Peak Hours (5AM, 6PM, 7PM, 8PM, 9PM): ₱150 base fee"
```

**After (Dynamic):**

```
Payment Policy
"Peak Hours (6PM, 7PM): ₱450 base fee"
↑ These values come from ClubSettings database collection
↑ Change them in the database, they update automatically in the rules
```

## How It Works

### 1. Database Layer

- **ClubSettings** model stores all configuration:
  - `peakHourFee`: ₱450
  - `offPeakHourFee`: ₱320
  - `guestFee`: ₱170
  - `peakHours`: [18, 19] (6PM, 7PM)
  - `operatingHoursStart`: 8
  - `operatingHoursEnd`: 19

### 2. Backend Rules

- Rules now have **placeholder syntax** in details:
  ```
  "Peak Hours ({peakHours}): ₱{peakHourFee} base fee"
  "Guest Fee: ₱{guestFee} per guest per hour"
  "Court operating hours: {operatingHoursStart}:00 AM - {operatingHoursEnd}:00 PM daily"
  ```

### 3. Frontend Component

- Fetches **both** rules AND settings in parallel:
  ```typescript
  forkJoin({
    rules: this.http.get("/api/rules"),
    settings: this.http.get("/api/club-settings"),
  });
  ```
- Replaces placeholders with actual values:
  ```typescript
  injectDynamicValues() {
    // Takes {peakHourFee} and replaces with ₱450
    // Takes {peakHours} and replaces with "6PM, 7PM"
    // etc.
  }
  ```

## API Endpoints

### GET /api/rules

Returns rules with placeholder syntax:

```json
{
  "title": "Payment Policy",
  "details": [
    "Peak Hours ({peakHours}): ₱{peakHourFee} base fee",
    "Guest Fee: ₱{guestFee} per guest"
  ]
}
```

### GET /api/club-settings

Returns all club settings for injection:

```json
{
  "pricing": {
    "peakHourFee": 450,
    "offPeakHourFee": 320,
    "guestFee": 170,
    "peakHours": [18, 19]
  },
  "operatingHours": {
    "start": 8,
    "end": 19
  }
}
```

## Files Modified

### Backend

1. **`backend/src/routes/clubSettingsRoutes.ts`** (NEW)
   - GET `/api/club-settings` endpoint
   - Returns club settings for the user's club

2. **`backend/src/server.ts`** (MODIFIED)
   - Added import for `clubSettingsRoutes`
   - Registered `app.use('/api/club-settings', clubSettingsRoutes)`

3. **`backend/src/scripts/seedRules.ts`** (MODIFIED)
   - Updated rule details to use placeholders:
     - `{peakHourFee}` → Gets replaced with ₱450
     - `{guestFee}` → Gets replaced with ₱170
     - `{peakHours}` → Gets replaced with "6PM, 7PM"
     - `{operatingHoursStart}` → Gets replaced with "8"
     - `{operatingHoursEnd}` → Gets replaced with "19"

4. **`backend/package.json`** (MODIFIED)
   - Added `setup-club-settings` script

5. **`backend/src/scripts/setupClubSettings.ts`** (NEW)
   - Initializes club settings if they don't exist
   - Creates default settings for a club

### Frontend

1. **`frontend/.../rules-and-regulations.component.ts`** (MODIFIED)
   - Imports `forkJoin` from rxjs
   - Added `ClubSettings` interface
   - Changed `loadRules()` → `loadRulesAndSettings()`
   - Fetches both rules and settings in parallel
   - Added `injectDynamicValues()` method that:
     - Replaces `{peakHourFee}` with actual value
     - Replaces `{guestFee}` with actual value
     - Replaces `{peakHours}` with formatted hours (e.g., "6PM, 7PM")
     - Replaces in both description and details array

## Placeholder Reference

| Placeholder             | Example  | Used In                      |
| ----------------------- | -------- | ---------------------------- |
| `{peakHourFee}`         | 450      | Payment Policy, Guest Policy |
| `{nonPeakHourFee}`      | 320      | Payment Policy               |
| `{guestFee}`            | 170      | Payment Policy, Guest Policy |
| `{peakHours}`           | 6PM, 7PM | Payment Policy               |
| `{operatingHoursStart}` | 8        | Operating Hours              |
| `{operatingHoursEnd}`   | 19       | Operating Hours              |

## Current Club Settings (Villa Gloria)

```
Peak Hour Fee: ₱450
Non-Peak Hour Fee: ₱320
Guest Fee: ₱170
Peak Hours: 6PM, 7PM (18, 19)
Operating Hours: 8AM - 7PM
```

## How To Update Values

### Option 1: Direct Database Edit

```javascript
db.clubsettings.updateOne(
  { clubId: ObjectId("club-id") },
  { $set: { "pricing.peakHourFee": 200 } },
);
```

### Option 2: Create Admin API (Future)

Create a PATCH `/api/club-settings` endpoint for admins to update values through the UI.

## Real-World Example

When user views the Payment Policy rule, they'll see:

```
Payment Policy
Play first, pay after. Payment button is enabled after your reservation time passes.

• Peak Hours (6PM, 7PM): ₱450 base fee
• Non-Peak Hours: ₱320 base fee
• Guest Fee: ₱170 per guest (added to reserver's payment)
• Base fee is split equally among all members
• Only the reserver pays for guests
• Payment must be completed within 30 days of play
```

All values (450, 320, 170, 6PM, 7PM) come from the database!

## Testing

1. **Navigate to `/rules`** page
2. **Rules load with injected values**
   - Payment Policy shows actual fees
   - Guest Policy shows actual guest fee
   - Operating Hours shows actual hours

3. **Verify in browser DevTools**:
   - Network tab shows `/api/rules` response with placeholders
   - Network tab shows `/api/club-settings` response with actual values
   - Component replaces them before rendering

4. **Change values in database** (future admin UI)
   - Run: `npm run setup-club-settings`
   - Modify the values in the script
   - Rules display updates automatically

## Future Enhancements

1. **Admin Settings UI**
   - Add page to edit club settings
   - Create PATCH endpoint: `PATCH /api/club-settings`
   - Allow admins to update fees and hours

2. **Validation**
   - Min/max value validation
   - No negative fees
   - Operating hours logic (start < end)

3. **History**
   - Track changes to settings
   - Show when/who changed values
   - Rollback functionality

4. **Multi-Club**
   - Each club has independent settings
   - Settings filtered by clubId
   - Rules shown with correct club's settings

## Status: ✅ COMPLETE

- ✅ Backend endpoints created
- ✅ Frontend component updated to fetch and inject values
- ✅ Rules reseeded with placeholder syntax
- ✅ Club settings exist in database
- ✅ No TypeScript compilation errors
- ✅ Ready to test

## Next Steps

1. Start backend (if not running): `npm start`
2. Start frontend: `cd frontend && ng serve`
3. Navigate to `/rules`
4. See actual fees (₱450, ₱320, ₱170) and hours (8AM-7PM, peak: 6PM-7PM) displayed!
