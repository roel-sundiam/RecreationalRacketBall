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

async function checkAdrianWins() {
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
    console.log(`📊 Current stats: ${user.matchesWon} wins, ${user.matchesPlayed} played, ${user.seedPoints} points`);

    // Find all seeding points for this user
    console.log('\n🔍 Finding all seeding point records...');
    const seedingPoints = await SeedingPoint.find({ userId: user._id }).sort({ createdAt: -1 });

    console.log(`\n📊 Found ${seedingPoints.length} seeding point records:`);
    for (const point of seedingPoints) {
      console.log(`\n  - ${point.description}`);
      console.log(`    Points: ${point.points}`);
      console.log(`    Source: ${point.source || 'unknown'}`);
      console.log(`    IsWinner: ${point.isWinner || false}`);
      console.log(`    TournamentId: ${point.tournamentId || 'N/A'}`);
      console.log(`    MatchIndex: ${point.matchIndex !== undefined ? point.matchIndex : 'N/A'}`);
      console.log(`    Created: ${point.createdAt}`);
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

checkAdrianWins();
