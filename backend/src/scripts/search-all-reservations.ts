/**
 * Search All Reservations Script
 *
 * USAGE:
 *   npm run search-reservations
 *
 * DO NOT run with: node src/scripts/search-all-reservations.ts
 *
 * This script searches and displays reservations from TennisClubRT2_Test database
 * with various filters including blocked reservations.
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Reservation from '../models/Reservation';

// Load environment variables
dotenv.config();

async function searchAllReservations() {
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

    console.log(`📊 Target Database: ${databaseName}\n`);

    if (databaseName !== allowedDatabase) {
      console.error('❌ ERROR: This script is configured to run ONLY on TennisClubRT2_Test database!');
      console.error(`❌ Current database: ${databaseName}`);
      console.error(`❌ Expected: ${allowedDatabase}\n`);
      process.exit(1);
    }

    console.log('✅ Database name verified: TennisClubRT2_Test\n');

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Search 1: ALL reservations in December and January
    console.log('=' .repeat(80));
    console.log('SEARCH 1: All reservations in December 2024 - January 2025');
    console.log('='.repeat(80));

    const decJanReservations = await Reservation.find({
      date: {
        $gte: new Date('2024-12-01'),
        $lte: new Date('2025-02-01')
      }
    })
    .populate('userId', 'username fullName email role')
    .sort({ date: 1, timeSlot: 1 });

    console.log(`\n📊 Found ${decJanReservations.length} reservation(s) in Dec 2024 - Jan 2025\n`);

    if (decJanReservations.length > 0) {
      displayReservations(decJanReservations);
    }

    // Search 2: Count by status
    console.log('\n' + '='.repeat(80));
    console.log('SEARCH 2: Reservation count by status');
    console.log('='.repeat(80) + '\n');

    const statuses = ['pending', 'confirmed', 'cancelled', 'completed', 'no-show', 'blocked'];
    for (const status of statuses) {
      const count = await Reservation.countDocuments({ status });
      console.log(`${status.toUpperCase().padEnd(15)} : ${count} reservation(s)`);
    }

    // Search 3: All reservations (last 20)
    console.log('\n' + '='.repeat(80));
    console.log('SEARCH 3: Last 20 reservations (any status, sorted by date)');
    console.log('='.repeat(80));

    const recentReservations = await Reservation.find()
      .populate('userId', 'username fullName email role')
      .sort({ date: -1, timeSlot: -1 })
      .limit(20);

    console.log(`\n📊 Found ${recentReservations.length} recent reservation(s)\n`);

    if (recentReservations.length > 0) {
      displayReservations(recentReservations);
    }

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

function displayReservations(reservations: any[]) {
  reservations.forEach((reservation, index) => {
    console.log(`\n[${index + 1}] ${'-'.repeat(76)}`);
    console.log(`ID:            ${reservation._id}`);
    console.log(`Date:          ${new Date(reservation.date).toDateString()} (${formatFullDate(reservation.date)})`);
    console.log(`Time:          ${formatTime(reservation.timeSlot)} - ${formatTime(reservation.endTimeSlot || reservation.timeSlot + 1)}`);
    console.log(`Duration:      ${reservation.duration || 1} hour(s)`);
    console.log(`Status:        ${reservation.status.toUpperCase()}`);
    console.log(`Payment:       ${reservation.paymentStatus || 'N/A'}`);
    console.log(`Total Fee:     ₱${reservation.totalFee}`);

    if (reservation.userId) {
      const user = reservation.userId as any;
      console.log(`Created By:    ${user.fullName} (${user.username}) - ${user.role}`);
    } else {
      console.log(`Created By:    N/A`);
    }

    console.log(`Players:       ${JSON.stringify(reservation.players)}`);

    if (reservation.status === 'blocked') {
      console.log(`Block Reason:  ${reservation.blockReason || 'N/A'}`);
      console.log(`Block Notes:   ${reservation.blockNotes || 'N/A'}`);
    }
  });

  console.log('\n' + '='.repeat(80));
}

function formatTime(hour: number): string {
  if (hour === 0) return '12AM';
  if (hour < 12) return `${hour}AM`;
  if (hour === 12) return '12PM';
  return `${hour - 12}PM`;
}

function formatFullDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

// Run the script
searchAllReservations();
