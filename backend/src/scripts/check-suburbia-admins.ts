import mongoose from 'mongoose';
import Club from '../models/Club';
import ClubMembership from '../models/ClubMembership';
import User from '../models/User';
import dotenv from 'dotenv';

dotenv.config();

async function checkSuburbiaAdmins() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    
    const club = await Club.findOne({ slug: 'suburbia' });
    if (!club) {
      console.log('Suburbia not found');
      process.exit(1);
    }
    
    console.log('Suburbia Club Members:\n');
    
    const memberships = await ClubMembership.find({ clubId: club._id });
    
    console.log('Total members:', memberships.length);
    console.log('');
    
    for (const m of memberships) {
      const user = await User.findById(m.userId);
      if (user) {
        console.log('Username:', user.username);
        console.log('  Full Name:', user.fullName);
        console.log('  Role:', m.role);
        console.log('  Status:', m.status);
        console.log('  Can approve members:', m.role === 'admin' || m.role === 'treasurer' ? 'YES ✓' : 'no');
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

checkSuburbiaAdmins();
