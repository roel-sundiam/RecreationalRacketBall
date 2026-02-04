import mongoose from 'mongoose';
import Club from '../models/Club';
import ClubMembership from '../models/ClubMembership';
import User from '../models/User';
import dotenv from 'dotenv';

dotenv.config();

async function checkClubs() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('Connected to MongoDB\n');
    
    // Get all active clubs
    const activeClubs = await Club.find({ status: 'active' });
    console.log(`📊 Total active clubs: ${activeClubs.length}`);
    activeClubs.forEach(club => {
      console.log(`  - ${club.name} (${club.slug})`);
    });
    
    // Check christellesundiam's memberships
    const user = await User.findOne({ username: 'christellesundiam' });
    if (user) {
      console.log(`\n👤 Checking memberships for: christellesundiam`);
      const memberships = await ClubMembership.find({ userId: user._id });
      console.log(`📋 User has ${memberships.length} membership(s):`);
      for (const m of memberships) {
        const club = await Club.findById(m.clubId);
        console.log(`  - ${club?.name} (status: ${m.status})`);
      }
    }
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkClubs();
