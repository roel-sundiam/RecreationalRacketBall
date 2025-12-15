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

async function fixWinnersCorrectly() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || '');
    console.log('✅ Connected to MongoDB');

    // Tournament 69200bf341e85ab1cbe03183
    // Team 1 (Winners): Adrian Raphael Choi & Ak Vinluan
    // Team 2 (Losers): Alyssa Mika Dianelo & Andrea Henson

    console.log('\n🔍 Finding all seeding points for tournament 69200bf341e85ab1cbe03183...');
    const seedingPoints = await SeedingPoint.find({ tournamentId: '69200bf341e85ab1cbe03183' });

    console.log(`📊 Found ${seedingPoints.length} seeding point records`);

    for (const point of seedingPoints) {
      const user = await User.findById(point.userId);
      if (!user) {
        console.log(`⚠️ User ${point.userId} not found`);
        continue;
      }

      console.log(`\n👤 ${user.fullName}`);
      console.log(`   Description: ${point.description}`);
      console.log(`   Points: ${point.points}`);
      console.log(`   Current isWinner: ${point.isWinner}`);

      // Determine if this user is a winner based on the description
      const isActualWinner = point.description.includes('(Winner)');

      if (isActualWinner !== point.isWinner) {
        console.log(`   ⚠️  MISMATCH! Should be: ${isActualWinner}`);

        // Update the seeding point
        await SeedingPoint.findByIdAndUpdate(point._id, {
          $set: { isWinner: isActualWinner }
        });

        // Update the user's matchesWon
        const currentUser = await User.findById(point.userId);
        const correctWins = isActualWinner ? 1 : 0;

        console.log(`   ✅ Updated isWinner to ${isActualWinner}`);
        console.log(`   ✅ Setting matchesWon to ${correctWins}`);

        await User.findByIdAndUpdate(point.userId, {
          $set: { matchesWon: correctWins }
        });
      } else {
        console.log(`   ✅ Correct!`);
      }
    }

    console.log('\n✅ All seeding points checked and corrected!');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

fixWinnersCorrectly();
