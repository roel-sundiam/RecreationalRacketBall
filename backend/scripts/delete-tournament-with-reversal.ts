import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Import models
import '../src/models/Tournament';
import '../src/models/SeedingPoint';
import '../src/models/User';

const Tournament = mongoose.model('Tournament');
const SeedingPoint = mongoose.model('SeedingPoint');
const User = mongoose.model('User');

async function deleteTournamentWithReversal(tournamentId: string) {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || '');
    console.log('✅ Connected to MongoDB');

    console.log(`\n🔍 Finding tournament: ${tournamentId}`);
    const tournament = await Tournament.findById(tournamentId);

    if (!tournament) {
      console.log('❌ Tournament not found');
      process.exit(1);
    }

    console.log(`✅ Found tournament: ${tournament.name}`);

    // Find all seeding points for this tournament
    console.log('\n♻️ Finding seeding points to reverse...');
    const seedingPoints = await SeedingPoint.find({ tournamentId });
    console.log(`📊 Found ${seedingPoints.length} seeding point records`);

    // Reverse each point
    for (const point of seedingPoints) {
      const user = await User.findById(point.userId);
      if (!user) {
        console.log(`⚠️  User ${point.userId} not found, skipping`);
        continue;
      }

      console.log(`♻️  Reversing ${point.points} points from ${user.fullName || user.username}`);

      // Reverse the points
      await User.findByIdAndUpdate(
        point.userId,
        {
          $inc: {
            seedPoints: -point.points,
            matchesPlayed: -1
          }
        }
      );

      // Delete the seeding point record
      await SeedingPoint.deleteOne({ _id: point._id });
    }

    console.log(`\n🗑️  Deleting tournament...`);
    await Tournament.deleteOne({ _id: tournamentId });

    console.log(`\n✅ SUCCESS! Tournament deleted and ${seedingPoints.length} points reversed`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Get tournament ID from command line
const tournamentId = process.argv[2];

if (!tournamentId) {
  console.log('Usage: ts-node delete-tournament-with-reversal.ts <tournamentId>');
  console.log('Example: ts-node delete-tournament-with-reversal.ts 6920085482409a6a8ee3a003');
  process.exit(1);
}

deleteTournamentWithReversal(tournamentId);
