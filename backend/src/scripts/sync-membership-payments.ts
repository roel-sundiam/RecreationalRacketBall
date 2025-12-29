/**
 * Sync Membership Payments Script
 *
 * USAGE:
 *   npm run sync-membership-payments
 *
 * This script syncs membership payment records with user accounts by ensuring
 * that users who have paid for 2026 have the year added to their membershipYearsPaid array.
 * This fixes the issue where the Homeowners tab shows "unpaid" even though payments exist.
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User';
import Payment from '../models/Payment';

// Load environment variables
dotenv.config();

interface SyncResult {
  userId: string;
  username: string;
  fullName: string;
}

const syncMembershipPayments = async () => {
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
      process.exit(1);
    }

    console.log('✅ Database name verified: TennisClubRT2_Test');
    console.log('✅ Safe to proceed with test database\n');

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find all 2026 membership fee payments with 'record' status
    console.log('🔍 Searching for 2026 membership fee payments...');
    const payments = await Payment.find({
      paymentType: 'membership_fee',
      membershipYear: 2026,
      status: 'record'
    }).lean();

    console.log(`Found ${payments.length} payment(s) with status 'record'\n`);

    if (payments.length === 0) {
      console.log('ℹ️  No payments found to process.');
      return;
    }

    console.log('=== Processing Payments ===\n');

    const updated: SyncResult[] = [];
    const alreadyHad: SyncResult[] = [];
    const userNotFound: string[] = [];
    const errors: Array<{ userId: string; error: string }> = [];

    // Get unique user IDs
    const userIds = [...new Set(payments.map(p => p.userId.toString()))];

    for (const userIdStr of userIds) {
      try {
        const user = await User.findById(userIdStr);

        if (!user) {
          console.log(`⚠️  User not found: ${userIdStr}`);
          userNotFound.push(userIdStr);
          continue;
        }

        // Check if user already has 2026 in membershipYearsPaid
        if (user.membershipYearsPaid && user.membershipYearsPaid.includes(2026)) {
          console.log(`ℹ️  ${user.fullName} (@${user.username}) - Already has 2026 in membershipYearsPaid`);
          alreadyHad.push({
            userId: userIdStr,
            username: user.username,
            fullName: user.fullName
          });
          continue;
        }

        // Update user with $addToSet to add 2026 to membershipYearsPaid array
        await User.findByIdAndUpdate(
          userIdStr,
          {
            $addToSet: { membershipYearsPaid: 2026 },
            $set: {
              membershipFeesPaid: true,
              lastMembershipPaymentDate: new Date()
            }
          },
          { new: true }
        );

        console.log(`✅ ${user.fullName} (@${user.username}) - 2026 added to membershipYearsPaid`);
        updated.push({
          userId: userIdStr,
          username: user.username,
          fullName: user.fullName
        });

      } catch (error: any) {
        console.log(`❌ Error processing user ${userIdStr}: ${error.message}`);
        errors.push({ userId: userIdStr, error: error.message });
      }
    }

    // Display summary
    console.log('\n' + '='.repeat(60));
    console.log('=== Summary ===');
    console.log('='.repeat(60));
    console.log(`Total unique users with payments: ${userIds.length}`);
    console.log(`✅ Updated: ${updated.length}`);
    console.log(`ℹ️  Already had 2026: ${alreadyHad.length}`);
    console.log(`⚠️  User not found: ${userNotFound.length}`);
    console.log(`❌ Errors: ${errors.length}`);
    console.log('='.repeat(60));

    if (updated.length > 0) {
      console.log('\n✅ Successfully Updated:');
      updated.forEach(u => console.log(`   - ${u.fullName} (@${u.username})`));
    }

    if (alreadyHad.length > 0) {
      console.log('\nℹ️  Already Had 2026:');
      alreadyHad.forEach(u => console.log(`   - ${u.fullName} (@${u.username})`));
    }

    if (userNotFound.length > 0) {
      console.log('\n⚠️  Users Not Found:');
      userNotFound.forEach(id => console.log(`   - ${id}`));
    }

    if (errors.length > 0) {
      console.log('\n❌ Errors:');
      errors.forEach(e => console.log(`   - ${e.userId}: ${e.error}`));
    }

    console.log('');

  } catch (error) {
    console.error('❌ Error syncing membership payments:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('📤 Disconnected from MongoDB');
  }
};

syncMembershipPayments();
