import mongoose from 'mongoose';
import Club from '../models/Club';
import ClubMembership from '../models/ClubMembership';
import User from '../models/User';
import dotenv from 'dotenv';

dotenv.config();

async function checkRoelRoles() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    
    const user = await User.findOne({ username: 'roelsundiam' });
    if (!user) {
      console.log('roelsundiam not found');
      process.exit(1);
    }
    
    console.log('User:', user.username);
    console.log('Platform Role:', user.platformRole || user.role);
    console.log('');
    console.log('Club Memberships:\n');
    
    const memberships = await ClubMembership.find({ userId: user._id });
    
    for (const m of memberships) {
      const club = await Club.findById(m.clubId);
      if (club) {
        console.log('Club:', club.name);
        console.log('  Role:', m.role);
        console.log('  Status:', m.status);
        console.log('  Admin privileges:', m.role === 'admin' || m.role === 'treasurer' ? 'YES ✓' : 'no');
        console.log('');
      }
    }
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkRoelRoles();
