import mongoose from 'mongoose';
import Tournament from './src/models/Tournament';
import User from './src/models/User';
import dotenv from 'dotenv';

dotenv.config();

async function testTournamentAPI() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || '');
    console.log('✅ Connected to MongoDB');

    // Simulate what the controller does
    const tournaments = await Tournament.find({})
      .sort({ date: -1, createdAt: -1 })
      .lean();

    console.log('\n📊 Found', tournaments.length, 'tournaments\n');

    // Manually populate like the controller
    const allUserIds = new Set<string>();

    tournaments.forEach(tournament => {
      tournament.matches?.forEach((match: any) => {
        console.log('\n🔍 Collecting IDs from match:');
        if (match.team2Player1) {
          console.log('  team2Player1:', match.team2Player1, '(trimmed:', match.team2Player1.trim(), ')');
          if (match.team2Player1 && match.team2Player1.trim()) {
            allUserIds.add(match.team2Player1);
            console.log('  ✅ Added to collection');
          } else {
            console.log('  ❌ NOT added (empty)');
          }
        }
        if (match.team2Player2) {
          console.log('  team2Player2:', match.team2Player2, '(trimmed:', match.team2Player2.trim(), ')');
          if (match.team2Player2 && match.team2Player2.trim()) {
            allUserIds.add(match.team2Player2);
            console.log('  ✅ Added to collection');
          } else {
            console.log('  ❌ NOT added (empty)');
          }
        }
        console.log('  team2Player1Name:', match.team2Player1Name);
        console.log('  team2Player2Name:', match.team2Player2Name);
      });
    });

    console.log('\n\n📝 Collected User IDs:', Array.from(allUserIds));

    const users = await User.find({ _id: { $in: Array.from(allUserIds) } })
      .select('_id username fullName')
      .lean();

    console.log('\n👥 Found Users:', users.map(u => ({ id: u._id, name: u.fullName })));

    const userMap = new Map(users.map(u => [u._id.toString(), u]));

    // Process one match to show the logic
    if (tournaments[0]?.matches?.[0]) {
      const match = tournaments[0].matches[0];
      console.log('\n\n🎾 Processing first match:');
      console.log('  team2Player1 ID:', match.team2Player1);
      console.log('  team2Player1 Name:', match.team2Player1Name);
      
      if (match.team2Player1 && match.team2Player1.trim() && !match.team2Player1Name?.trim()) {
        const user = userMap.get(match.team2Player1);
        console.log('  👉 Should populate with user:', user);
      } else {
        console.log('  👉 Should NOT populate because:');
        console.log('     - Has ID?', !!match.team2Player1);
        console.log('     - ID trimmed?', match.team2Player1?.trim());
        console.log('     - Has custom name?', !!match.team2Player1Name);
        console.log('     - Custom name trimmed?', match.team2Player1Name?.trim());
      }
    }

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testTournamentAPI();
