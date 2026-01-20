const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const Payment = require('./dist/models/Payment').default;
  const User = require('./dist/models/User').default;

  const user = await User.findOne({ username: 'RoelSundiam' });
  if (!user) {
    console.log('User not found');
    process.exit(0);
  }

  console.log('User ID:', user._id.toString());

  const payments = await Payment.find({ userId: user._id }).sort({ createdAt: -1 });

  console.log('\nTotal payments found:', payments.length);
  console.log('\nPayment breakdown by status:');

  const statusCount = {};
  payments.forEach(p => {
    statusCount[p.status] = (statusCount[p.status] || 0) + 1;
  });

  Object.entries(statusCount).forEach(([status, count]) => {
    console.log(`  ${status}: ${count}`);
  });

  console.log('\nAll payments:');
  payments.forEach(p => {
    const date = new Date(p.paymentDate || p.createdAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const isManual = p.metadata?.isManualPayment ? '[MANUAL]' : '';
    console.log(`  [${p.status}] ${isManual} ${p.description} - ${date} - ₱${p.amount}`);
  });

  process.exit(0);
}).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
