import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Import models
import '../src/models/Tournament';
import '../src/models/User';

const Tournament = mongoose.model('Tournament');
const User = mongoose.model('User');

async function checkTournamentDetails() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || '');
    console.log('✅ Connected to MongoDB');

    console.log('\n🔍 Finding tournament 69200bf341e85ab1cbe03183...');
    const tournament = await Tournament.findById('69200bf341e85ab1cbe03183');

    if (!tournament) {
      console.log('❌ Tournament not found');
      process.exit(1);
    }

    console.log(`✅ Found tournament: ${tournament.name}`);
    console.log(`📅 Date: ${tournament.date}`);
    console.log(`📊 Total matches: ${tournament.matches.length}`);

    for (let i = 0; i < tournament.matches.length; i++) {
      const match = tournament.matches[i];
      console.log(`\n🎾 Match ${i + 1}:`);
      console.log(`   Type: ${match.matchType}`);
      console.log(`   Score: ${match.score}`);
      console.log(`   Round: ${match.round}`);

      if (match.matchType === 'doubles') {
        const t1p1 = await User.findById(match.team1Player1);
        const t1p2 = await User.findById(match.team1Player2);
        const t2p1 = await User.findById(match.team2Player1);
        const t2p2 = await User.findById(match.team2Player2);

        console.log(`   Team 1: ${t1p1?.fullName} & ${t1p2?.fullName}`);
        console.log(`   Team 2: ${t2p1?.fullName} & ${t2p2?.fullName}`);
        console.log(`   Winner: ${match.winner}`);
        console.log(`   Team 1 Games: ${match.team1Games}`);
        console.log(`   Team 2 Games: ${match.team2Games}`);
      } else {
        const p1 = await User.findById(match.player1);
        const p2 = await User.findById(match.player2);
        const winner = await User.findById(match.winner);

        console.log(`   Player 1: ${p1?.fullName}`);
        console.log(`   Player 2: ${p2?.fullName}`);
        console.log(`   Winner: ${winner?.fullName}`);
      }
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

checkTournamentDetails();
