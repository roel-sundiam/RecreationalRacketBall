/**
 * Delete Blocked Reservations Script
 *
 * USAGE:
 *   npm run delete-blocked-reservation
 *
 * DO NOT run with: node src/scripts/delete-blocked-reservation.ts
 *
 * This script lists all blocked reservations in TennisClubRT2_Test database
 * and allows you to delete them interactively.
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Reservation from '../models/Reservation';
import User from '../models/User';
import readline from 'readline';

// Load environment variables
dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query: string): Promise<string> {
  return new Promise(resolve => rl.question(query, resolve));
}

async function findAndDeleteBlockedReservation() {
  try {
    console.log('🔍 Connecting to MongoDB...');

    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI not found in environment variables');
    }

    // Safety check: Ensure we're only using TennisClubRT2_Test database
    const allowedDatabase = 'TennisClubRT2_Test';
    const mongoUri = process.env.MONGODB_URI;

    // Extract database name from connection string
    const dbNameMatch = mongoUri.match(/\/([^/?]+)(\?|$)/);
    const databaseName = dbNameMatch ? dbNameMatch[1] : null;

    console.log(`📊 Target Database: ${databaseName}`);
    console.log(`✅ Allowed Database: ${allowedDatabase}\n`);

    if (databaseName !== allowedDatabase) {
      console.error('❌ ERROR: This script is configured to run ONLY on TennisClubRT2_Test database!');
      console.error(`❌ Current database in MONGODB_URI: ${databaseName}`);
      console.error(`❌ Expected database: ${allowedDatabase}`);
      console.error('\n⚠️  To protect production data, this script will NOT proceed.\n');
      rl.close();
      process.exit(1);
    }

    console.log('✅ Database name verified: TennisClubRT2_Test');
    console.log('✅ Safe to proceed with test database\n');

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB (TennisClubRT2_Test)\n');

    // Find ALL blocked reservations (any date)
    console.log('🔎 Searching for ALL blocked reservations...\n');

    const blockedReservations = await Reservation.find({
      status: 'blocked'
    })
    .populate('userId', 'username fullName email role')
    .sort({ date: 1, timeSlot: 1 }); // Sort by date ascending, then time ascending

    if (blockedReservations.length === 0) {
      console.log('❌ No blocked reservations found in the database');
      rl.close();
      await mongoose.disconnect();
      return;
    }

    console.log(`📊 Found ${blockedReservations.length} blocked reservation(s):\n`);
    console.log('='.repeat(80));

    blockedReservations.forEach((reservation, index) => {
      console.log(`\n[${index + 1}] Reservation Details:`);
      console.log('─'.repeat(80));
      console.log(`ID:               ${reservation._id}`);
      console.log(`Date:             ${new Date(reservation.date).toDateString()}`);
      console.log(`Time Slot:        ${reservation.timeSlot}:00 (${formatTime(reservation.timeSlot)})`);
      console.log(`End Time Slot:    ${reservation.endTimeSlot}:00 (${formatTime(reservation.endTimeSlot || reservation.timeSlot + 1)})`);
      console.log(`Duration:         ${reservation.duration} hour(s)`);
      console.log(`Time Display:     ${formatTime(reservation.timeSlot)} - ${formatTime(reservation.endTimeSlot || reservation.timeSlot + 1)}`);
      console.log(`Status:           ${reservation.status.toUpperCase()}`);
      console.log(`Block Reason:     ${reservation.blockReason || 'N/A'}`);
      console.log(`Block Notes:      ${reservation.blockNotes || 'N/A'}`);
      console.log(`Total Fee:        ₱${reservation.totalFee}`);

      if (reservation.userId) {
        const user = reservation.userId as any;
        console.log(`Created By:       ${user.fullName} (${user.username})`);
        console.log(`User Role:        ${user.role}`);
        console.log(`User Email:       ${user.email}`);
      }

      console.log(`Players:          ${JSON.stringify(reservation.players)}`);
      console.log(`Created At:       ${reservation.createdAt}`);
      console.log(`Updated At:       ${reservation.updatedAt}`);
      console.log('─'.repeat(80));
    });

    console.log('\n' + '='.repeat(80));
    console.log('\n⚠️  WARNING: You are about to delete the reservation(s) listed above.');
    console.log('⚠️  This action CANNOT be undone!\n');

    const answer = await question('Do you want to proceed with deletion? (yes/no): ');

    if (answer.toLowerCase() === 'yes') {
      console.log('\n🗑️  Deleting ALL blocked reservation(s)...');

      const deleteResult = await Reservation.deleteMany({
        status: 'blocked'
      });

      console.log(`✅ Successfully deleted ${deleteResult.deletedCount} blocked reservation(s)`);
    } else {
      console.log('\n❌ Deletion cancelled. No changes were made.');
    }

    rl.close();
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error:', error);
    rl.close();
    await mongoose.disconnect();
    process.exit(1);
  }
}

function formatTime(hour: number): string {
  if (hour === 0) return '12AM';
  if (hour < 12) return `${hour}AM`;
  if (hour === 12) return '12PM';
  return `${hour - 12}PM`;
}

// Run the script
findAndDeleteBlockedReservation();
