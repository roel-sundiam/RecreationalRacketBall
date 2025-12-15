import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

import '../src/models/Tournament';

const Tournament = mongoose.model('Tournament');

async function fixTournamentPointsProcessed() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || '');
    console.log('✅ Connected to MongoDB\n');

    const tournamentId = '69200bf341e85ab1cbe03183';
    const tournament = await Tournament.findById(tournamentId);

    if (!tournament) {
      console.log('❌ Tournament not found');
      process.exit(1);
    }

    console.log(`🏆 Tournament: ${tournament.name}`);
    console.log(`   Total Matches: ${tournament.matches.length}\n`);

    // Set Match 1 (index 0) to pointsProcessed: true
    // because Adrian & Ak already have their points
    if (tournament.matches[0]) {
      tournament.matches[0].pointsProcessed = true;
      console.log(`✅ Set Match 1 pointsProcessed to true`);
    }

    // Match 2 (index 1) stays false so it can be processed
    if (tournament.matches[1]) {
      console.log(`✅ Match 2 pointsProcessed remains false (to be processed)`);
    }

    await tournament.save();
    console.log('\n✅ Tournament updated successfully!');
    console.log('👉 Now click "Process Points" button to process Match 2');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

fixTournamentPointsProcessed();
