import mongoose from 'mongoose';
import Tournament from './src/models/Tournament';
import dotenv from 'dotenv';

dotenv.config();

async function checkMatchData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || '');
    console.log('✅ Connected to MongoDB');

    const tournaments = await Tournament.find({});

    console.log('\n📊 Tournament Match Data:');
    tournaments.forEach((tournament: any) => {
      console.log(`\n🏆 Tournament: ${tournament.name}`);
      console.log(`   Date: ${tournament.date}`);
      console.log(`   Status: ${tournament.status}`);
      console.log(`   Total Matches: ${tournament.matches.length}`);

      tournament.matches.forEach((match: any, index: number) => {
        console.log(`\n   Match ${index + 1}:`);
        console.log(`   - Type: ${match.matchType}`);
        console.log(`   - Round: ${match.round}`);
        console.log(`   - Score: ${match.score}`);
        console.log(`   - Winner: ${match.winner}`);

        if (match.matchType === 'singles') {
          console.log(`   - Player 1: ${match.player1}`);
          console.log(`   - Player 1 Name: ${match.player1Name}`);
          console.log(`   - Player 2: ${match.player2}`);
          console.log(`   - Player 2 Name: ${match.player2Name}`);
        } else {
          console.log(`   - Team 1 Player 1: ${match.team1Player1}`);
          console.log(`   - Team 1 Player 1 Name: ${match.team1Player1Name}`);
          console.log(`   - Team 1 Player 2: ${match.team1Player2}`);
          console.log(`   - Team 1 Player 2 Name: ${match.team1Player2Name}`);
          console.log(`   - Team 2 Player 1: ${match.team2Player1}`);
          console.log(`   - Team 2 Player 1 Name: ${match.team2Player1Name}`);
          console.log(`   - Team 2 Player 2: ${match.team2Player2}`);
          console.log(`   - Team 2 Player 2 Name: ${match.team2Player2Name}`);
        }
      });
    });

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkMatchData();
