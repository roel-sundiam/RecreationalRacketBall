import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import User from '../models/User';
import ClubMembership from '../models/ClubMembership';
import Club from '../models/Club';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function fixMembership() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    
    const user = await User.findOne({ username: 'roelsundiam' });
    const club = await Club.findOne({ name: 'Suburbia' });
    
    if (!user || !club) {
      console.log('❌ User or club not found');
      await mongoose.disconnect();
      return;
    }
    
    const membership = await ClubMembership.findOne({ 
      userId: user._id, 
      clubId: club._id 
    });
    
    if (!membership) {
      console.log('❌ Membership not found');
      await mongoose.disconnect();
      return;
    }
    
    console.log('📋 Current membership status:', membership.status);
    console.log('📋 Current membership role:', membership.role);
    
    if (membership.status !== 'approved') {
      console.log('\n🔧 Approving membership...');
      membership.status = 'approved';
      await membership.save();
      console.log('✅ Membership approved successfully!');
    } else {
      console.log('✅ Membership already approved');
    }
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

fixMembership();
