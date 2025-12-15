import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Import models
import '../src/models/User';

const User = mongoose.model('User');

async function fixAdrianWins() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || '');
    console.log('✅ Connected to MongoDB');

    console.log('\n🔍 Finding Adrian Raphael Choi...');
    const user = await User.findOne({ fullName: 'Adrian Raphael Choi' });

    if (!user) {
      console.log('❌ User not found');
      process.exit(1);
    }

    console.log(`✅ Found: ${user.fullName}`);
    console.log(`📊 Current stats: ${user.matchesWon} wins, ${user.matchesPlayed} played`);

    // Set matchesWon to 0 since the seeding point has isWinner: false
    console.log('\n♻️  Resetting matchesWon to 0...');
    await User.findByIdAndUpdate(user._id, {
      $set: {
        matchesWon: 0
      }
    });

    const updated = await User.findById(user._id);
    console.log(`✅ Updated: ${updated.matchesWon} wins, ${updated.matchesPlayed} played`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

fixAdrianWins();
