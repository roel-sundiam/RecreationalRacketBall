import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Payment from '../models/Payment';
import Reservation from '../models/Reservation';
import User from '../models/User';

dotenv.config();

async function checkPaymentStatus() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || '');
    console.log('✅ Connected to MongoDB');

    const referenceNumber = 'TC-1767085544188-SKSZR2';

    console.log(`\n🔍 Searching for payment with reference: ${referenceNumber}\n`);

    // Find payment by reference number
    const payment = await Payment.findOne({ referenceNumber }).lean();

    if (!payment) {
      console.log(`❌ Payment with reference ${referenceNumber} not found in database!`);
      console.log(`\nPossible reasons:`);
      console.log(`   - Reference number is incorrect`);
      console.log(`   - Payment was deleted`);
      console.log(`   - Payment exists with different reference number`);
      await mongoose.disconnect();
      process.exit(1);
    }

    console.log(`✅ Payment Found!\n`);
    console.log(`📋 Payment Details:`);
    console.log(`   Payment ID: ${payment._id}`);
    console.log(`   Reference Number: ${payment.referenceNumber}`);
    console.log(`   Status: ${payment.status}`);
    console.log(`   Amount: ₱${payment.amount}`);
    console.log(`   Currency: ${payment.currency}`);
    console.log(`   Payment Method: ${payment.paymentMethod}`);
    console.log(`   Payment Type: ${payment.paymentType || 'court_usage'}`);
    console.log(`   Description: ${payment.description}`);
    console.log(`   Created At: ${new Date(payment.createdAt).toISOString()}`);
    console.log(`   Updated At: ${new Date(payment.updatedAt).toISOString()}`);
    console.log(`   Due Date: ${new Date(payment.dueDate).toISOString()}`);
    console.log(`   Payment Date: ${payment.paymentDate ? new Date(payment.paymentDate).toISOString() : 'Not set'}`);

    // Get user details
    if (payment.userId) {
      const user = await User.findById(payment.userId).lean();
      if (user) {
        console.log(`\n👤 User Details:`);
        console.log(`   User ID: ${user._id}`);
        console.log(`   Username: ${user.username}`);
        console.log(`   Full Name: ${user.fullName}`);
      }
    }

    // Get reservation details if linked
    if (payment.reservationId) {
      const reservation = await Reservation.findById(payment.reservationId).lean();
      if (reservation) {
        console.log(`\n🎾 Reservation Details:`);
        console.log(`   Reservation ID: ${reservation._id}`);
        console.log(`   Date: ${new Date(reservation.date).toISOString()}`);
        console.log(`   Time Slot: ${reservation.timeSlot}:00 - ${reservation.timeSlot + (reservation.duration || 1)}:00`);
        console.log(`   Players: ${(reservation as any).players?.join(', ') || 'N/A'}`);
        console.log(`   Status: ${reservation.status}`);
        console.log(`   Payment Status: ${reservation.paymentStatus}`);
        console.log(`   Total Fee: ₱${reservation.totalFee}`);
      } else {
        console.log(`\n⚠️  Reservation ID exists but reservation not found: ${payment.reservationId}`);
      }
    }

    // Check if payment would appear in admin reports
    console.log(`\n\n📊 Admin Reports Check:`);

    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const createdAt = new Date(payment.createdAt);
    const isWithin30Days = createdAt >= thirtyDaysAgo;

    console.log(`   Current Date: ${now.toISOString()}`);
    console.log(`   30 Days Ago: ${thirtyDaysAgo.toISOString()}`);
    console.log(`   Payment Created: ${createdAt.toISOString()}`);
    console.log(`   Within 30-day window: ${isWithin30Days ? '✅ YES' : '❌ NO'}`);
    console.log(`   Status is "completed": ${payment.status === 'completed' ? '✅ YES' : '❌ NO (status: ' + payment.status + ')'}`);

    console.log(`\n🔍 Should appear in reports: ${isWithin30Days && payment.status === 'completed' ? '✅ YES' : '❌ NO'}`);

    // Identify issues
    const issues: string[] = [];

    if (!isWithin30Days) {
      const daysOld = Math.ceil((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
      issues.push(`Payment is ${daysOld} days old (outside 30-day default window)`);
    }

    if (payment.status !== 'completed') {
      issues.push(`Payment status is "${payment.status}" instead of "completed"`);
    }

    if (payment.status === 'completed' && !payment.paymentDate) {
      issues.push(`Payment status is "completed" but paymentDate is not set`);
    }

    if (issues.length > 0) {
      console.log(`\n⚠️  Issues Found:`);
      issues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue}`);
      });

      console.log(`\n🔧 Recommended Fixes:`);

      if (!isWithin30Days) {
        console.log(`   - Update createdAt to match reservation date or recent date`);
      }

      if (payment.status !== 'completed') {
        console.log(`   - Update status to "completed"`);
      }

      if (payment.status === 'completed' && !payment.paymentDate) {
        console.log(`   - Set paymentDate to createdAt or current date`);
      }

      // Auto-fix option
      console.log(`\n💡 Would you like to auto-fix these issues? (Run with --fix flag)`);

      if (process.argv.includes('--fix')) {
        console.log(`\n🔧 Applying fixes...\n`);

        const updates: any = {};

        // Fix 1: Update createdAt if outside window
        if (!isWithin30Days && payment.reservationId) {
          const reservation = await Reservation.findById(payment.reservationId).lean();
          if (reservation) {
            const reservationDate = new Date(reservation.date);
            updates.createdAt = reservationDate;
            console.log(`   ✅ Setting createdAt to reservation date: ${reservationDate.toISOString()}`);
          }
        }

        // Fix 2: Update status to completed
        if (payment.status !== 'completed') {
          updates.status = 'completed';
          console.log(`   ✅ Setting status to "completed"`);
        }

        // Fix 3: Set paymentDate if missing
        if (payment.status === 'completed' && !payment.paymentDate) {
          updates.paymentDate = payment.createdAt;
          console.log(`   ✅ Setting paymentDate to createdAt: ${new Date(payment.createdAt).toISOString()}`);
        }

        if (Object.keys(updates).length > 0) {
          await Payment.findByIdAndUpdate(payment._id, updates);
          console.log(`\n✅ Payment updated successfully!`);
          console.log(`\nRun this script again without --fix to verify the changes.`);
        } else {
          console.log(`\n✅ No fixes needed!`);
        }
      }
    } else {
      console.log(`\n✅ No issues found! Payment should appear in admin reports.`);
      console.log(`\nIf it's still not showing:`);
      console.log(`   1. Check if you're viewing the correct date range in /admin/reports`);
      console.log(`   2. Try expanding the date range to include ${createdAt.toLocaleDateString()}`);
      console.log(`   3. Refresh the reports page`);
      console.log(`   4. Check browser console for any JavaScript errors`);
    }

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkPaymentStatus();
