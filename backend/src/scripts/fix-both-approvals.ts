import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import User from '../models/User';
import ClubMembership from '../models/ClubMembership';
import Club from '../models/Club';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function fixBothApprovals() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    
    const user = await User.findOne({ username: 'roelsundiam' });
    const club = await Club.findOne({ name: 'Suburbia' });
    
    if (!user || !club) {
      console.log('❌ User or club not found');
      await mongoose.disconnect();
      return;
    }
    
    console.log('📋 Fixing user approval...');
    user.isApproved = true;
    await user.save();
    console.log('✅ User.isApproved = true');
    
    const membership = await ClubMembership.findOne({ 
      userId: user._id, 
      clubId: club._id 
    });
    
    if (!membership) {
      console.log('❌ Membership not found');
      await mongoose.disconnect();
      return;
    }
    
    console.log('📋 Fixing membership status...');
    membership.status = 'approved';
    await membership.save();
    console.log('✅ ClubMembership.status = approved');
    
    console.log('\n🎉 Both approvals fixed!');
    console.log('⚠️  WARNING: DO NOT click "Unapprove" on your own account!');
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

fixBothApprovals();
