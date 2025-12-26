# List Reservations Without Payments Script

## Overview

This script identifies and reports all pending reservations in the database that don't have associated payment records. It's useful for auditing payment completeness and identifying data inconsistencies.

## Purpose

- Find pending reservations that are missing payment records
- Compare reservation status between Test and Production databases
- Identify reservations that may have been copied from another database without payments
- Audit payment record completeness

## Features

- ✅ Read-only operation (does not modify any data)
- ✅ Dual database support (current + production comparison)
- ✅ Filters out cancelled, no-show, confirmed, and completed reservations
- ✅ Excludes Super Administrator reservations
- ✅ Shows production database status for comparison
- ✅ Clean, concise output format

## Prerequisites

### Environment Variables Required

**`.env` file must contain:**

```bash
# Current database to check (usually Test)
MONGODB_URI=mongodb+srv://...

# Production database for comparison (optional)
MONGODB_URI_PROD=mongodb+srv://...
```

**Note:** If `MONGODB_URI_PROD` is not set, the script will only check the current database without comparison.

## Configuration

### Current Setup (as of latest)

- **Current Database:** Test (`TennisClubRT2_Test`) - Line 6 of `.env`
- **Production Database:** Production (`TennisClubRT2`) - Line 10 of `.env`

The script will:
1. Check **Test database** for pending reservations without payments
2. Compare with **Production database** to see status there

## Usage

### Basic Command

From project root:
```bash
node backend/list-reservations-no-payments.js
```

From backend directory:
```bash
cd backend
node list-reservations-no-payments.js
```

## What the Script Does

1. **Connects to Database(s)**
   - Current database (MONGODB_URI)
   - Production database (MONGODB_URI_PROD) if configured

2. **Finds Reservations**
   - Status: `pending` only
   - Excludes: `cancelled`, `no-show`, `confirmed`, `completed`
   - Excludes: Super Administrator reservations
   - Must have: No payment records

3. **Checks Production** (if configured)
   - Looks up the same user in production
   - Finds matching reservation by date/time/user
   - Checks if payment records exist
   - Reports status comparison

4. **Displays Results**
   - Date, time slot, reserver, amount
   - Production status (if applicable)

## Output Format

### Without Production Database

```
📊 Total pending reservations (excluding Super Administrator): 5

🔍 RESERVATIONS WITHOUT PAYMENT RECORDS: 5

1. Dec 26, 2025 | 6:00 - 7:00 | Dan Castro (@DanCastro) | ₱40
2. Dec 15, 2025 | 18:00 - 21:00 | Pauleen Aina Sengson (@PauleenSengson) | ₱300
3. Dec 4, 2025 | 18:00 - 19:00 | Jhen Cunanan (@JhenCunanan) | ₱100
4. Dec 4, 2025 | 16:00 - 18:00 | Joey Espiritu (@JoeyEspiritu) | ₱40
5. Dec 1, 2025 | 17:00 - 18:00 | Roel Sundiam (@RoelSundiam) | ₱20
```

### With Production Database Comparison

```
📊 Total pending reservations (excluding Super Administrator): 5

🔍 RESERVATIONS WITHOUT PAYMENT RECORDS: 5

1. Dec 26, 2025 | 6:00 - 7:00 | Dan Castro (@DanCastro) | ₱40 | 🔴 Not in Prod
2. Dec 15, 2025 | 18:00 - 21:00 | Pauleen Aina Sengson (@PauleenSengson) | ₱300 | ✅ Prod: completed (1 payment)
3. Dec 4, 2025 | 18:00 - 19:00 | Jhen Cunanan (@JhenCunanan) | ₱100 | ⚠️ Prod: pending (no payments)
4. Dec 4, 2025 | 16:00 - 18:00 | Joey Espiritu (@JoeyEspiritu) | ₱40 | ⚠️ User not in Prod
5. Dec 1, 2025 | 17:00 - 18:00 | Roel Sundiam (@RoelSundiam) | ₱20 | ✅ Prod: confirmed (2 payments)
```

## Output Indicators

| Indicator | Meaning |
|-----------|---------|
| `✅ Prod: status (X payments)` | Reservation exists in production with payment records |
| `⚠️ Prod: status (no payments)` | Reservation exists in production but has no payment records |
| `🔴 Not in Prod` | Reservation doesn't exist in production database |
| `⚠️ User not in Prod` | User account doesn't exist in production database |

## Common Use Cases

### 1. Audit After Database Copy

After copying data from production to test using `npm run copy-to-test`, run this script to verify payment records were created properly.

```bash
node backend/list-reservations-no-payments.js
```

### 2. Find Data Inconsistencies

Identify reservations that exist in test but not in production, or vice versa.

### 3. Verify Payment System

Ensure all pending reservations have corresponding payment records as expected by the system.

## Important Notes

### Safety

- ✅ **100% READ-ONLY** - This script does NOT modify any data
- ✅ Safe to run in production environment
- ✅ No side effects on either database

### Limitations

- Only shows pending reservations (filters out other statuses)
- Excludes Super Administrator reservations (blocking reservations)
- Requires matching usernames between databases for comparison

### Database Copy Impact

This script is completely independent from the database copy operation:
- `npm run copy-to-test` uses only `MONGODB_URI`
- This script uses `MONGODB_URI` and `MONGODB_URI_PROD`
- Adding `MONGODB_URI_PROD` does NOT affect copy operations

## Troubleshooting

### Issue: "MONGODB_URI environment variable is not set"

**Solution:** Ensure `.env` file exists in `backend/` directory with `MONGODB_URI` configured.

### Issue: No production comparison shown

**Solution:** Add `MONGODB_URI_PROD` to `.env` file (line 10).

### Issue: Script shows "User not in Prod" for all users

**Solution:** Verify that `MONGODB_URI_PROD` points to the correct production database with user data.

## Related Documentation

- [Database Copy Guide](../DATABASE_COPY_GUIDE.md) - For copying databases
- [Test Credentials](../TEST_CREDENTIALS.md) - Test user accounts
- [Claude Guide](../CLAUDE.md) - Development guidelines

## Script Location

```
backend/list-reservations-no-payments.js
```

## Last Updated

December 25, 2025
