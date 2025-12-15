import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

import '../src/models/Tournament';

const Tournament = mongoose.model('Tournament');

async function checkTournamentMatches() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || '');
    console.log('✅ Connected to MongoDB\n');

    const tournaments = await Tournament.find().sort({ createdAt: -1 }).limit(3);

    for (const tournament of tournaments) {
      console.log(`🏆 Tournament: ${tournament.name}`);
      console.log(`   Status: ${tournament.status}`);
      console.log(`   Date: ${tournament.date}`);
      console.log(`   Total Matches: ${tournament.matches.length}`);
      console.log(`   Matches:`);

      tournament.matches.forEach((match: any, index: number) => {
        console.log(`\n   Match ${index + 1}:`);
        console.log(`     Type: ${match.matchType}`);
        console.log(`     Score: ${match.score}`);
        console.log(`     Round: ${match.round}`);
        console.log(`     Points Processed: ${match.pointsProcessed}`);

        if (match.matchType === 'doubles') {
          console.log(`     Winner: ${match.winner}`);
        }
      });
      console.log('\n' + '='.repeat(60) + '\n');
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

checkTournamentMatches();
