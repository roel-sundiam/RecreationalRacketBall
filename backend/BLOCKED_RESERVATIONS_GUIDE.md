# Blocked Reservations Troubleshooting Guide

## Overview

This guide explains how to troubleshoot and fix issues with blocked court reservations that don't appear correctly in the admin interface.

## Common Problem: Admin Page Shows 0 Active Blocks

### Symptoms
- Admin page `/admin/block-court` shows no active blocks
- Users can see "BLOCKED" entries on `/my-reservations` page
- You know blocked reservations exist in the database

### Root Cause

Blocked reservations have the **wrong status field**:
- **Incorrect:** `status: 'confirmed'` (with `reservationType: 'blocked'` or `blockReason` field)
- **Correct:** `status: 'blocked'`

The admin page queries for `status: 'blocked'`, so it won't find reservations with the wrong status.

## How to Diagnose

### Step 1: Check if blocked reservations exist

```bash
cd backend
npm run search-reservations
```

Look for reservations with:
- `status: 'confirmed'`
- `blockReason` field present
- `players: ["BLOCKED"]`

### Step 2: Count misaligned blocked reservations

Run this quick check:
```bash
node -e "
require('dotenv').config();
const { MongoClient } = require('mongodb');
(async () => {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();

  const correctCount = await db.collection('reservations').countDocuments({ status: 'blocked' });
  const wrongCount = await db.collection('reservations').countDocuments({
    blockReason: { \$exists: true, \$ne: null },
    status: { \$ne: 'blocked' }
  });

  console.log('✅ Reservations with status=blocked (correct):', correctCount);
  console.log('❌ Reservations with blockReason but wrong status:', wrongCount);

  await client.close();
})();
"
```

## How to Fix

### Automatic Fix (Recommended)

Run the fix script:
```bash
cd backend
npm run fix-blocked-status
```

This script will:
1. Find all reservations with `blockReason` field but `status != 'blocked'`
2. Show you what will be changed
3. Update them to `status: 'blocked'`
4. Report how many were fixed

**Safe to run:** Only affects reservations that already have `blockReason` set.

### Verify the Fix

After running the fix script:

1. **Check the database:**
   ```bash
   npm run delete-blocked-reservation
   ```
   You should see all blocked reservations listed. Type `no` when prompted to delete.

2. **Check the admin page:**
   - Open `/admin/block-court` in your browser
   - Refresh the page
   - You should now see all active court blocks listed

## Understanding the Data Model

### Correct Blocked Reservation Structure

```json
{
  "_id": "...",
  "date": "2025-12-25T00:00:00.000Z",
  "timeSlot": 5,
  "endTimeSlot": 17,
  "duration": 12,
  "status": "blocked",           // ✅ MUST be 'blocked'
  "paymentStatus": "not_applicable",
  "blockReason": "other",        // maintenance | private_event | weather | other
  "blockNotes": "Christmas Day",
  "players": [],
  "totalFee": 0,
  "userId": "<admin-user-id>",   // Admin who created the block
  "weatherForecast": { ... }
}
```

### How Blocks Are Created

When an admin creates a court block via `/admin/block-court`:

**Backend:** `backend/src/controllers/reservationController.ts` - `blockCourt()` function (line 1413)

**API Endpoint:** `POST /api/reservations/admin/block`

**Request Body:**
```json
{
  "date": "2025-12-25",
  "timeSlot": 5,
  "duration": 12,
  "blockReason": "other",
  "blockNotes": "Christmas Day"
}
```

### How Blocks Are Displayed

**Admin Page:** `/admin/block-court`
- **API Call:** `GET /api/reservations/admin/blocks`
- **Backend Query:** `Reservation.find({ status: 'blocked' })`
- **File:** `backend/src/controllers/reservationController.ts` - `getBlockedReservations()` (line 1522)

**User Page:** `/my-reservations` (All Reservations tab)
- **API Call:** `GET /api/reservations?showAll=true&limit=1000`
- **Returns:** All reservations including blocked ones
- **Display:** Shows creator's name (e.g., "Super Administrator")

## Available Scripts

### Fix Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| Fix blocked status | `npm run fix-blocked-status` | Corrects reservations with wrong status field |
| Delete blocked reservations | `npm run delete-blocked-reservation` | Interactive script to view and delete blocked reservations |
| Search all reservations | `npm run search-reservations` | View all reservations with details |

### Quick Checks

**Count blocked reservations:**
```bash
node -e "require('dotenv').config(); const {MongoClient}=require('mongodb'); (async()=>{const c=new MongoClient(process.env.MONGODB_URI);await c.connect();const cnt=await c.db().collection('reservations').countDocuments({status:'blocked'});console.log('Blocked:',cnt);await c.close();})();"
```

**List blocked dates:**
```bash
node -e "require('dotenv').config(); const {MongoClient}=require('mongodb'); (async()=>{const c=new MongoClient(process.env.MONGODB_URI);await c.connect();const r=await c.db().collection('reservations').find({status:'blocked'}).project({date:1,timeSlot:1,blockReason:1}).sort({date:1}).toArray();r.forEach(x=>console.log(x.date.toISOString().split('T')[0],x.timeSlot+':00',x.blockReason));await c.close();})();"
```

## Prevention

To avoid this issue in the future:

1. **Always use the admin interface** to create blocked reservations (don't manually insert into database)
2. **After data imports/migrations**, run the fix script to ensure correct status
3. **Verify admin page shows blocks** after creating them
4. **Regular checks** using `npm run search-reservations` to spot issues early

## Related Files

- **Fix Script:** `backend/fix-blocked-status.js`
- **Backend Controller:** `backend/src/controllers/reservationController.ts`
  - `blockCourt()` - Creates blocks (line 1413)
  - `getBlockedReservations()` - Fetches blocks for admin page (line 1522)
- **Frontend Admin Component:** `frontend/src/app/components/admin-block-court/admin-block-court.component.ts`
- **Reservation Model:** `backend/src/models/Reservation.ts`

## Questions?

If blocked reservations still don't appear after running the fix script:

1. Check the backend console for errors
2. Verify MONGODB_URI is pointing to the correct database
3. Check browser console for API errors
4. Verify admin user has correct permissions
5. Check if reservations are actually in the database with the search script
