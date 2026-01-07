import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

async function testReportsAPI() {
  try {
    // This simulates what the frontend does
    const baseUrl = 'http://localhost:3000/api';

    // Calculate date range (last 30 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    console.log('🔍 Testing Admin Reports API\n');
    console.log(`Date Range:`);
    console.log(`   Start: ${startDate.toISOString()}`);
    console.log(`   End: ${endDate.toISOString()}\n`);

    const params = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    };

    console.log('📡 Making API request to /api/payments...\n');
    console.log(`Note: This requires authentication. If you get 401, you need to run this from the frontend with a valid JWT.\n`);
    console.log(`For now, let's check the database directly instead.\n`);

    // Since we can't authenticate easily from a script, let's use mongoose
    const mongoose = require('mongoose');
    const Payment = require('../models/Payment').default;
    const User = require('../models/User').default;
    const Reservation = require('../models/Reservation').default;

    await mongoose.connect(process.env.MONGODB_URI || '');
    console.log('✅ Connected to MongoDB\n');

    // Build the same filter the backend uses
    const fromDate = new Date(params.startDate);
    const toDate = new Date(params.endDate);
    toDate.setHours(23, 59, 59, 999);

    const filter = {
      createdAt: {
        $gte: fromDate,
        $lte: toDate
      }
    };

    console.log('📊 Querying payments with filter:', filter, '\n');

    const payments = await Payment.find(filter)
      .populate('userId', 'username fullName email')
      .populate({
        path: 'reservationId',
        select: 'date timeSlot players status endTimeSlot duration',
        options: { strictPopulate: false }
      })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    console.log(`✅ Found ${payments.length} payments in date range\n`);

    // Check for our specific payment
    const targetPayment = payments.find((p: any) => p.referenceNumber === 'TC-1767085544188-SKSZR2');

    if (targetPayment) {
      console.log('✅ Target payment TC-1767085544188-SKSZR2 FOUND in results!\n');
      console.log('Payment Details:');
      console.log(`   Index in array: ${payments.indexOf(targetPayment)}`);
      console.log(`   Status: ${targetPayment.status}`);
      console.log(`   Amount: ₱${targetPayment.amount}`);
      console.log(`   Created: ${new Date(targetPayment.createdAt).toISOString()}`);
      console.log(`   User: ${targetPayment.userId?.fullName || 'Unknown'}`);
      console.log(`   Reservation ID: ${targetPayment.reservationId?._id || 'None'}`);

      if (targetPayment.reservationId) {
        console.log(`\n   Reservation Details:`);
        console.log(`      Date: ${targetPayment.reservationId.date}`);
        console.log(`      Time Slot: ${targetPayment.reservationId.timeSlot}`);
        console.log(`      Players: ${JSON.stringify(targetPayment.reservationId.players, null, 2)}`);
        console.log(`      Status: ${targetPayment.reservationId.status}`);
      }

      console.log(`\n✅ This payment SHOULD appear in the "Active Payments" tab (status: completed)`);
    } else {
      console.log('❌ Target payment TC-1767085544188-SKSZR2 NOT FOUND in results!\n');
      console.log('This means it was filtered out by the date range query.');
      console.log('Let me check if it exists in the database at all...\n');

      const directPayment = await Payment.findOne({ referenceNumber: 'TC-1767085544188-SKSZR2' }).lean();

      if (directPayment) {
        console.log('✅ Payment exists in database');
        console.log(`   Created: ${new Date(directPayment.createdAt).toISOString()}`);
        console.log(`   Expected in range: ${new Date(directPayment.createdAt) >= fromDate && new Date(directPayment.createdAt) <= toDate ? 'YES' : 'NO'}`);
      } else {
        console.log('❌ Payment does not exist in database at all!');
      }
    }

    console.log(`\n\n📋 All payments summary:`);
    console.log(`   Total: ${payments.length}`);
    console.log(`   Completed: ${payments.filter((p: any) => p.status === 'completed').length}`);
    console.log(`   Pending: ${payments.filter((p: any) => p.status === 'pending').length}`);
    console.log(`   Record: ${payments.filter((p: any) => p.status === 'record').length}`);
    console.log(`   Failed: ${payments.filter((p: any) => p.status === 'failed').length}`);
    console.log(`   Refunded: ${payments.filter((p: any) => p.status === 'refunded').length}`);

    await mongoose.disconnect();
    console.log('\n✅ Done!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testReportsAPI();
