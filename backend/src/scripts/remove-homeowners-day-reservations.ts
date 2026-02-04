import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Reservation from '../models/Reservation';

dotenv.config();

const removeHomeownersDayReservations = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('✅ Connected to MongoDB');

    // Find all Homeowner's Day reservations
    // These are likely blocked reservations with blockNotes containing "Homeowner"
    const homeownerReservations = await Reservation.find({
      $or: [
        { blockNotes: /Homeowner/i },
        { blockReason: 'private_event', status: 'blocked' }
      ]
    });

    console.log(`\n📋 Found ${homeownerReservations.length} Homeowner's Day/blocked reservation(s):`);

    if (homeownerReservations.length === 0) {
      console.log('✅ No Homeowner\'s Day reservations found.');
      await mongoose.disconnect();
      process.exit(0);
    }

    // Display found reservations
    homeownerReservations.forEach(res => {
      console.log(`\n   📅 Date: ${res.date.toISOString().split('T')[0]}`);
      console.log(`   ⏰ Time: ${res.timeSlot}:00 - ${res.endTimeSlot || res.timeSlot + (res.duration || 1)}:00`);
      console.log(`   📝 Block Notes: ${res.blockNotes || 'N/A'}`);
      console.log(`   🚫 Block Reason: ${res.blockReason || 'N/A'}`);
      console.log(`   🆔 ID: ${res._id}`);
      console.log(`   📊 Status: ${res.status}`);
    });

    // Delete all Homeowner's Day reservations
    const result = await Reservation.deleteMany({
      $or: [
        { blockNotes: /Homeowner/i },
        { blockReason: 'private_event', status: 'blocked' }
      ]
    });

    console.log(`\n✅ Successfully deleted ${result.deletedCount} Homeowner's Day reservation(s)`);

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during removal:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

removeHomeownersDayReservations();
