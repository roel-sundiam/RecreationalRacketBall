import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Payment from '../models/Payment';

dotenv.config();

async function findPaymentPosition() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || '');
    console.log('✅ Connected to MongoDB\n');

    // Build the same filter the backend uses
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const fromDate = new Date(startDate.toISOString());
    const toDate = new Date(endDate.toISOString());
    toDate.setHours(23, 59, 59, 999);

    const filter = {
      createdAt: {
        $gte: fromDate,
        $lte: toDate
      }
    };

    console.log(`📊 Date Range:`);
    console.log(`   From: ${fromDate.toISOString()}`);
    console.log(`   To: ${toDate.toISOString()}\n`);

    // Get ALL payments without limit, sorted by createdAt descending (same as backend)
    const allPayments = await Payment.find(filter)
      .select('referenceNumber status createdAt amount')
      .sort({ createdAt: -1 })
      .lean();

    console.log(`✅ Total payments in range: ${allPayments.length}\n`);

    // Find the position of our target payment
    const targetRef = 'TC-1767085544188-SKSZR2';
    const position = allPayments.findIndex((p: any) => p.referenceNumber === targetRef);

    if (position === -1) {
      console.log(`❌ Payment ${targetRef} not found in results!`);
    } else {
      console.log(`✅ Payment ${targetRef} found at position: ${position + 1} of ${allPayments.length}`);
      console.log(`\n📋 Payment details at that position:`);
      const payment = allPayments[position]!;
      console.log(`   Reference: ${payment.referenceNumber}`);
      console.log(`   Status: ${payment.status}`);
      console.log(`   Amount: ₱${payment.amount}`);
      console.log(`   Created: ${new Date(payment.createdAt).toISOString()}`);

      if (position >= 100) {
        console.log(`\n⚠️  PROBLEM FOUND!`);
        console.log(`   The payment is at position ${position + 1}, which is beyond the default limit of 100.`);
        console.log(`   This is why it doesn't appear in the admin reports page.`);
        console.log(`\n🔧 Solution: The frontend needs to either:`);
        console.log(`   1. Increase the limit parameter when fetching payments`);
        console.log(`   2. Implement pagination controls`);
        console.log(`   3. Add infinite scroll or "Load More" functionality`);
      } else {
        console.log(`\n✅ Payment is within the first 100 results and should be visible.`);
      }
    }

    console.log(`\n\n📈 Breakdown by status:`);
    const completed = allPayments.filter((p: any) => p.status === 'completed').length;
    const pending = allPayments.filter((p: any) => p.status === 'pending').length;
    const record = allPayments.filter((p: any) => p.status === 'record').length;
    const failed = allPayments.filter((p: any) => p.status === 'failed').length;
    const refunded = allPayments.filter((p: any) => p.status === 'refunded').length;

    console.log(`   Completed: ${completed}`);
    console.log(`   Pending: ${pending}`);
    console.log(`   Record: ${record}`);
    console.log(`   Failed: ${failed}`);
    console.log(`   Refunded: ${refunded}`);
    console.log(`   Total: ${allPayments.length}`);

    await mongoose.disconnect();
    console.log('\n✅ Done!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

findPaymentPosition();
