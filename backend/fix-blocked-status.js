/**
 * Fix Blocked Reservations Status Script
 *
 * PURPOSE:
 *   Fixes blocked reservations that have the wrong status field.
 *   Some blocked reservations may have status='confirmed' instead of status='blocked'.
 *   This script corrects the data by setting status='blocked' for all reservations
 *   that have a blockReason field.
 *
 * WHEN TO USE:
 *   - Admin page (/admin/block-court) shows 0 active blocks but you know blocks exist
 *   - Blocked reservations not appearing in admin block management
 *   - After data migration or import that may have corrupted blocked reservation status
 *   - Database has reservations with blockReason but status != 'blocked'
 *
 * USAGE:
 *   npm run fix-blocked-status
 *
 * OR:
 *   node fix-blocked-status.js
 *
 * WHAT IT DOES:
 *   1. Finds all reservations with blockReason field set
 *   2. Checks if status is NOT 'blocked'
 *   3. Updates status to 'blocked' for those reservations
 *   4. Reports how many were fixed
 *
 * SAFE TO RUN:
 *   Yes - only updates reservations that already have blockReason set.
 *   Will not affect regular (non-blocked) reservations.
 *
 * DATABASE:
 *   Connects to the database specified in MONGODB_URI (.env file)
 */
require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

async function fixBlockedStatus() {
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db();

    console.log('Finding reservations with blockReason but wrong status...\n');

    // Find all reservations that have blockReason but status is not 'blocked'
    const reservationsToFix = await db.collection('reservations')
      .find({
        blockReason: { $exists: true, $ne: null },
        status: { $ne: 'blocked' }
      })
      .toArray();

    console.log(`Found ${reservationsToFix.length} reservations to fix:\n`);

    if (reservationsToFix.length === 0) {
      console.log('No reservations need fixing!');
      return;
    }

    // Show what will be fixed
    for (const res of reservationsToFix) {
      console.log(`- ${res.date.toISOString().split('T')[0]} at ${res.timeSlot}:00`);
      console.log(`  Current status: ${res.status}`);
      console.log(`  Block reason: ${res.blockReason}`);
      console.log(`  Will change to: blocked\n`);
    }

    // Update all to status: 'blocked'
    const result = await db.collection('reservations').updateMany(
      {
        blockReason: { $exists: true, $ne: null },
        status: { $ne: 'blocked' }
      },
      {
        $set: { status: 'blocked' }
      }
    );

    console.log(`✅ Updated ${result.modifiedCount} reservation(s) to status='blocked'`);

    // Verify the fix
    const verified = await db.collection('reservations')
      .find({ status: 'blocked' })
      .toArray();

    console.log(`\n✅ Total blocked reservations now: ${verified.length}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

fixBlockedStatus();
