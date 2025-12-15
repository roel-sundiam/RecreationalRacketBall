import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Import models
import '../src/models/User';
import '../src/models/SeedingPoint';

const User = mongoose.model('User');
const SeedingPoint = mongoose.model('SeedingPoint');

async function fixWinnersManually() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || '');
    console.log('✅ Connected to MongoDB');

    // Find Adrian and Ak's seeding points (they have "Won" in description)
    console.log('\n🔍 Finding seeding points with "Won" in description for tournament 69200bf341e85ab1cbe03183...');
    const winnerPoints = await SeedingPoint.find({
      tournamentId: '69200bf341e85ab1cbe03183',
      description: { $regex: 'Won' }
    });

    console.log(`📊 Found ${winnerPoints.length} winner records`);

    for (const point of winnerPoints) {
      const user = await User.findById(point.userId);
      if (!user) {
        console.log(`⚠️ User ${point.userId} not found`);
        continue;
      }

      console.log(`\n👤 ${user.fullName}`);
      console.log(`   Current isWinner: ${point.isWinner}`);
      console.log(`   Current matchesWon: ${user.matchesWon}`);

      // Update the seeding point to isWinner: true
      await SeedingPoint.findByIdAndUpdate(point._id, {
        $set: { isWinner: true }
      });

      // Update the user's matchesWon to 1
      await User.findByIdAndUpdate(point.userId, {
        $set: { matchesWon: 1 }
      });

      console.log(`   ✅ Updated isWinner to true`);
      console.log(`   ✅ Updated matchesWon to 1`);
    }

    console.log('\n✅ All winners corrected!');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

fixWinnersManually();
