import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Reservation from '../models/Reservation';

dotenv.config();

const findWednesdayReservations = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('✅ Connected to MongoDB');

    // Find reservations on Feb 4 and Feb 11, 2026 (Wednesdays) at 6-8 PM
    const feb4 = new Date('2026-02-04');
    const feb11 = new Date('2026-02-11');

    const reservations = await Reservation.find({
      $or: [
        { date: feb4, timeSlot: { $in: [18, 19] } },
        { date: feb11, timeSlot: { $in: [18, 19] } }
      ]
    }).populate('userId', 'username fullName');

    console.log(`\n📋 Found ${reservations.length} reservation(s) on Wednesdays at 6-8 PM:`);

    if (reservations.length === 0) {
      console.log('✅ No Wednesday reservations found.');
      await mongoose.disconnect();
      process.exit(0);
    }

    // Display all found reservations
    reservations.forEach(res => {
      console.log(`\n========================================`);
      console.log(`🆔 ID: ${res._id}`);
      console.log(`📅 Date: ${res.date.toISOString().split('T')[0]}`);
      console.log(`⏰ Time: ${res.timeSlot}:00 - ${res.endTimeSlot || res.timeSlot + 1}:00`);
      console.log(`👤 User: ${(res.userId as any)?.fullName || 'N/A'} (@${(res.userId as any)?.username || 'N/A'})`);
      console.log(`📊 Status: ${res.status}`);
      console.log(`💰 Payment Status: ${res.paymentStatus}`);
      console.log(`🚫 Block Reason: ${res.blockReason || 'None'}`);
      console.log(`📝 Block Notes: ${res.blockNotes || 'None'}`);
      console.log(`👥 Players: ${JSON.stringify(res.players)}`);
      console.log(`🏷️  Club ID: ${res.clubId}`);
    });

    console.log(`\n========================================`);
    console.log(`\nTotal: ${reservations.length} reservation(s)`);

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during search:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

findWednesdayReservations();
