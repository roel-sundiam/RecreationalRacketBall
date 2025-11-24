import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

import '../src/models/User';
import '../src/models/SeedingPoint';

const User = mongoose.model('User');
const SeedingPoint = mongoose.model('SeedingPoint');

async function checkPlayersPoints() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || '');
    console.log('✅ Connected to MongoDB\n');

    const playerNames = ['Antonnette Tayag', 'Bi Angeles', 'Carlos Naguit', 'CJ Yu'];

    for (const name of playerNames) {
      const user = await User.findOne({ fullName: name });
      if (!user) {
        console.log(`❌ ${name} not found`);
        continue;
      }

      console.log(`👤 ${name}`);
      console.log(`   Seed Points: ${user.seedPoints || 0}`);
      console.log(`   Matches Won: ${user.matchesWon || 0}`);
      console.log(`   Matches Played: ${user.matchesPlayed || 0}`);

      const points = await SeedingPoint.find({ userId: user._id }).sort({ createdAt: -1 });
      console.log(`   Total Point Records: ${points.length}`);

      if (points.length > 0) {
        console.log(`   Recent points:`);
        points.slice(0, 3).forEach(p => {
          console.log(`     - ${p.description} (${p.points} pts, isWinner: ${p.isWinner || false})`);
        });
      }
      console.log('');
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

checkPlayersPoints();
