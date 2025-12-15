import mongoose from 'mongoose';
import Tournament from './src/models/Tournament';
import dotenv from 'dotenv';

dotenv.config();

async function checkTournamentCount() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || '');
    console.log('✅ Connected to MongoDB');

    const totalCount = await Tournament.countDocuments({});
    const activeCompleted = await Tournament.countDocuments({
      status: { $in: ['active', 'completed'] }
    });

    console.log(`\n📊 Tournament Statistics:`);
    console.log(`   Total tournaments: ${totalCount}`);
    console.log(`   Active/Completed tournaments: ${activeCompleted}`);

    const tournaments = await Tournament.find({
      status: { $in: ['active', 'completed'] }
    }).select('name status matches createdAt');

    console.log(`\n📋 Tournament List:`);
    tournaments.forEach((t, index) => {
      const matchCount = t.matches ? t.matches.length : 0;
      console.log(`   ${index + 1}. ${t.name} (${t.status}) - ${matchCount} matches`);
    });

    let totalMatches = 0;
    tournaments.forEach((t: any) => {
      if (t.matches && Array.isArray(t.matches)) {
        totalMatches += t.matches.length;
      }
    });

    console.log(`\n🎾 Total Matches: ${totalMatches}`);

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkTournamentCount();
