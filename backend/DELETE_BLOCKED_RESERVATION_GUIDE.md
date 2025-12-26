# Delete Blocked Reservation Script

## Overview

This script helps you safely find and delete blocked reservations from the database with confirmation before deletion.

## Database Information

- **Database:** `TennisClubRT2_Test` (ONLY - production databases are blocked)
- **Collection:** `reservations`
- **Model:** Reservation
- **Location:** `/backend/src/models/Reservation.ts`

## ⚠️ Important Safety Feature

**This script ONLY works with the `TennisClubRT2_Test` database.**

The script includes built-in protection that:
- ✅ Verifies the database name before proceeding
- ❌ Blocks execution if any other database is detected
- 🛡️ Protects production data from accidental deletion

If your `.env` file points to a different database, the script will **exit immediately** without making any changes.

## How to Use

### Step 1: Navigate to Backend Directory

```bash
cd backend
```

### Step 2: Run the Script

```bash
npm run delete-blocked-reservation
```

### Step 3: Review the Output

The script will:

1. **Connect to MongoDB** using your `MONGODB_URI` from `.env`
2. **Search** for ALL blocked reservations (any date, any year)
3. **Display** detailed information about each blocked reservation:
   - Reservation ID
   - Date (e.g., "Wed Dec 31 2025")
   - Time slots (5AM - 5PM format)
   - Duration (number of hours)
   - Status (BLOCKED)
   - Block reason (maintenance, private_event, weather, other)
   - Block notes
   - Total fee
   - Created by (username, role, email)
   - Players list
   - Created and updated timestamps

### Step 4: Confirm Deletion

The script will ask:

```
⚠️  WARNING: You are about to delete the reservation(s) listed above.
⚠️  This action CANNOT be undone!

Do you want to proceed with deletion? (yes/no):
```

- Type `yes` to delete the reservation(s)
- Type `no` to cancel and exit without making changes

### Step 5: Verify Results

If you confirmed deletion:
```
✅ Successfully deleted X reservation(s)
```

If you cancelled:
```
❌ Deletion cancelled. No changes were made.
```

## Example Output

### Successful Run (TennisClubRT2_Test database)

```
🔍 Connecting to MongoDB...
📊 Target Database: TennisClubRT2_Test
✅ Allowed Database: TennisClubRT2_Test

✅ Database name verified: TennisClubRT2_Test
✅ Safe to proceed with test database

✅ Connected to MongoDB (TennisClubRT2_Test)

🔎 Searching for ALL blocked reservations...

📊 Found 4 blocked reservation(s):

================================================================================

[1] Reservation Details:
────────────────────────────────────────────────────────────────────────────────
ID:               67890abcdef12345
Date:             Wed Dec 31 2025
Time Slot:        5:00 (5AM)
End Time Slot:    17:00 (5PM)
Duration:         12 hour(s)
Time Display:     5AM - 5PM
Status:           BLOCKED
Block Reason:     maintenance
Block Notes:      Court resurfacing
Total Fee:        ₱0
Created By:       Super Administrator (superadmin)
User Role:        superadmin
User Email:       admin@example.com
Players:          []
Created At:       2025-12-15T10:30:00.000Z
Updated At:       2025-12-15T10:30:00.000Z
────────────────────────────────────────────────────────────────────────────────

================================================================================

⚠️  WARNING: You are about to delete the reservation(s) listed above.
⚠️  This action CANNOT be undone!

Do you want to proceed with deletion? (yes/no):
```

### Blocked Run (Wrong database detected)

```
🔍 Connecting to MongoDB...
📊 Target Database: TennisClubRT2_Production
✅ Allowed Database: TennisClubRT2_Test

❌ ERROR: This script is configured to run ONLY on TennisClubRT2_Test database!
❌ Current database in MONGODB_URI: TennisClubRT2_Production
❌ Expected database: TennisClubRT2_Test

⚠️  To protect production data, this script will NOT proceed.

[Script exits without making any changes]
```

## What Gets Deleted

The script deletes **ALL** reservations with `status: 'blocked'` in the database, regardless of date.

This includes all blocked reservations such as:
- December 31: 5AM - 5PM
- December 31: 5PM - 10PM
- January 1: 5AM - 5PM
- January 1: 5PM - 10PM
- Any other blocked reservations

All blocked reservations will be shown for review before deletion.

## Safety Features

✅ **Read-only first** - Shows data before asking for confirmation
✅ **Explicit confirmation** - Requires typing "yes" to proceed
✅ **Clear warnings** - Multiple warnings that deletion cannot be undone
✅ **Detailed output** - Shows exactly what will be deleted
✅ **No auto-delete** - Won't delete anything without your confirmation

## Troubleshooting

### Error: "This script is configured to run ONLY on TennisClubRT2_Test database!"

This is a **safety feature** to prevent accidental deletion in production.

**Solution:** Ensure your `.env` file points to the test database:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/TennisClubRT2_Test?retryWrites=true&w=majority
```

The database name in the connection string **must be** `TennisClubRT2_Test`.

### Error: "MONGODB_URI not found in environment variables"

Make sure your `.env` file in the backend directory contains:
```env
MONGODB_URI=mongodb+srv://your-connection-string/TennisClubRT2_Test
```

### Error: "No blocked reservations found"

This means:
- All blocked reservations have already been deleted
- There are no reservations with `status: 'blocked'` in the database
- The reservations might have a different status (check the frontend display)

## Alternative: Manual MongoDB Query

If you prefer to delete manually using MongoDB Compass or Shell:

```javascript
// Find ALL blocked reservations first
db.reservations.find({
  status: "blocked"
})

// After confirming, delete ALL blocked reservations
db.reservations.deleteMany({
  status: "blocked"
})

// Or delete a specific one by ID
db.reservations.deleteOne({
  _id: ObjectId("your-reservation-id-here")
})
```

## Need Help?

- Check the MongoDB connection in your backend logs
- Verify the date format matches your data
- Ensure you have the correct permissions to delete from the database
