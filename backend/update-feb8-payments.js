const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

async function updateFeb8Payments() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;

    // Find Villa Gloria
    const villaGloria = await db.collection('clubs').findOne({
      name: { $regex: 'Villa Gloria', $options: 'i' }
    });

    // Find the reservation
    const reservationDate = new Date('2026-02-08T00:00:00.000Z');
    const reservation = await db.collection('reservations').findOne({
      clubId: villaGloria._id,
      date: reservationDate,
      timeSlot: 20
    });

    console.log('=== UPDATING PAYMENTS FOR FEB 8 RESERVATION ===');
    console.log(`Reservation ID: ${reservation._id}\n`);

    // Get all payments for this reservation
    const payments = await db.collection('payments').find({
      reservationId: reservation._id
    }).toArray();

    console.log(`Found ${payments.length} payments\n`);

    // Calculate correct amounts
    const MEMBER_SHARE = 300;  // ₱900 / 3 members
    const GUEST_FEES = 340;    // 1 guest × ₱170 × 2 hours
    const RESERVER_TOTAL = MEMBER_SHARE + GUEST_FEES;  // ₱640

    console.log('Correct amounts:');
    console.log(`  Reserver (Christian): ₱${RESERVER_TOTAL} (₱${MEMBER_SHARE} member + ₱${GUEST_FEES} guests)`);
    console.log(`  Christopher: ₱${MEMBER_SHARE}`);
    console.log(`  Helen: ₱${MEMBER_SHARE}\n`);

    // Update each payment
    for (const payment of payments) {
      const user = await db.collection('users').findOne({ _id: payment.userId });
      const userName = user ? user.fullName : 'Unknown';
      const username = user ? user.username : 'Unknown';

      console.log(`${userName} (${username}):`);
      console.log(`  Current amount: ₱${payment.amount}`);

      let newAmount;
      let description;

      // Determine correct amount based on user
      if (username === 'ChristianSundiam') {
        newAmount = RESERVER_TOTAL;
        description = `Court Reservation - Reserver (₱${MEMBER_SHARE} member share + ₱${GUEST_FEES} guest fees)`;
      } else if (username === 'ChristopherSundiam') {
        newAmount = MEMBER_SHARE;
        description = `Court Reservation - Member share`;
      } else if (username === 'HelenSundiam') {
        newAmount = MEMBER_SHARE;
        description = `Court Reservation - Member share`;
      } else {
        console.log(`  ⚠️  Unknown user, skipping...`);
        continue;
      }

      console.log(`  New amount: ₱${newAmount}`);
      console.log(`  Change: ₱${newAmount - payment.amount} (${newAmount > payment.amount ? 'increase' : 'decrease'})`);

      if (newAmount !== payment.amount) {
        const result = await db.collection('payments').updateOne(
          { _id: payment._id },
          {
            $set: {
              amount: newAmount,
              description: description,
              correctionReason: 'Fixed Helen Sundiam member classification - was incorrectly marked as guest'
            }
          }
        );
        console.log(`  ✅ Updated (${result.modifiedCount} modified)`);
      } else {
        console.log(`  ℹ️  Amount already correct, no update needed`);
      }
      console.log('');
    }

    // Summary
    console.log('=== SUMMARY ===');
    console.log('✅ All payments updated successfully!\n');

    // Verify final state
    console.log('=== VERIFICATION ===');
    const finalPayments = await db.collection('payments').find({
      reservationId: reservation._id
    }).toArray();

    let totalPayments = 0;
    for (const payment of finalPayments) {
      const user = await db.collection('users').findOne({ _id: payment.userId });
      const userName = user ? user.fullName : 'Unknown';
      console.log(`${userName}: ₱${payment.amount} (${payment.status})`);
      totalPayments += payment.amount;
    }

    console.log(`\n💰 Total payments: ₱${totalPayments}`);
    console.log(`📊 Reservation totalFee: ₱${reservation.totalFee}`);

    if (totalPayments === reservation.totalFee) {
      console.log('✅ Payments match reservation total!');
    } else {
      console.log(`⚠️  Mismatch: Difference of ₱${Math.abs(totalPayments - reservation.totalFee)}`);
    }

    console.log(`\n💡 Christian's payment reduced from ₱1,130 to ₱640 (saved ₱490)`);

    await mongoose.disconnect();
    console.log('\n✅ Disconnected');
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
  }
}

updateFeb8Payments();
