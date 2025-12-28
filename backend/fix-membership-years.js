const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  try {
    const db = mongoose.connection.db;
    const users = db.collection('users');
    const payments = db.collection('payments');

    console.log('=== Scanning 2026 Membership Payments ===\n');

    // Find all 2026 membership fee payments
    const membershipPayments = await payments.find({
      paymentType: 'membership_fee',
      membershipYear: 2026,
      status: 'record'
    }).toArray();

    console.log(`Found ${membershipPayments.length} membership payments for 2026\n`);

    let fixedCount = 0;
    let alreadyCorrect = 0;
    const fixed = [];
    const errors = [];

    for (const payment of membershipPayments) {
      try {
        // Get the user
        const user = await users.findOne({ _id: new mongoose.Types.ObjectId(payment.userId) });

        if (!user) {
          console.log(`⚠️  User not found for payment ${payment._id}`);
          errors.push({ paymentId: payment._id, reason: 'User not found' });
          continue;
        }

        // Check if 2026 is already in membershipYearsPaid
        const hasPaid = user.membershipYearsPaid && user.membershipYearsPaid.includes(2026);

        if (hasPaid) {
          alreadyCorrect++;
          console.log(`✅ ${user.fullName} (${user.username}) - Already has 2026 in array`);
        } else {
          // Fix the user record
          const result = await users.updateOne(
            { _id: user._id },
            {
              $addToSet: { membershipYearsPaid: 2026 },
              $set: {
                membershipFeesPaid: true,
                lastMembershipPaymentDate: payment.paymentDate || new Date()
              }
            }
          );

          if (result.modifiedCount > 0) {
            fixedCount++;
            console.log(`🔧 FIXED: ${user.fullName} (${user.username}) - Added 2026 to array`);
            fixed.push({
              username: user.username,
              fullName: user.fullName,
              paymentAmount: payment.amount,
              paymentDate: payment.paymentDate
            });
          }
        }
      } catch (error) {
        console.error(`❌ Error processing payment ${payment._id}:`, error.message);
        errors.push({ paymentId: payment._id, error: error.message });
      }
    }

    console.log('\n=== Summary ===');
    console.log(`Total 2026 payments: ${membershipPayments.length}`);
    console.log(`Already correct: ${alreadyCorrect}`);
    console.log(`Fixed: ${fixedCount}`);
    console.log(`Errors: ${errors.length}`);

    if (fixed.length > 0) {
      console.log('\n=== Users Fixed ===');
      fixed.forEach(u => {
        console.log(`- ${u.fullName} (${u.username}) - ₱${u.amount} on ${new Date(u.paymentDate).toLocaleDateString()}`);
      });
    }

    if (errors.length > 0) {
      console.log('\n=== Errors ===');
      errors.forEach(e => {
        console.log(`- Payment ${e.paymentId}: ${e.reason || e.error}`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
});
