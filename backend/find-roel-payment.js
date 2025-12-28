const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  try {
    const db = mongoose.connection.db;
    const users = db.collection('users');
    const payments = db.collection('payments');

    // Get Roel's user ID
    const roel = await users.findOne({ username: 'RoelSundiam' });

    if (!roel) {
      console.log('User not found');
      process.exit(1);
    }

    console.log('=== RoelSundiam ===');
    console.log('User ID:', roel._id.toString());
    console.log('Full Name:', roel.fullName);
    console.log('membershipYearsPaid:', roel.membershipYearsPaid || []);
    console.log('');

    // Find payment with matching userId
    const payment = await payments.findOne({
      userId: roel._id.toString(),
      paymentType: 'membership_fee',
      membershipYear: 2026
    });

    if (payment) {
      console.log('✅ FOUND 2026 Membership Payment:');
      console.log('Amount: ₱' + payment.amount);
      console.log('Method:', payment.paymentMethod);
      console.log('Date:', new Date(payment.paymentDate).toLocaleDateString());
      console.log('Status:', payment.status);
      console.log('');
      console.log('❌ BUT membershipYearsPaid is:', roel.membershipYearsPaid || '[]');
      console.log('');
      console.log('🔧 ISSUE: Payment exists but user.membershipYearsPaid was not updated!');
      console.log('This is why the Status shows "Unpaid" - the array needs to include 2026');
    } else {
      console.log('No 2026 payment found for this user');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
});
