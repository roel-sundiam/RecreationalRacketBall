import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import User from '../models/User';
import ClubMembership from '../models/ClubMembership';
import Club from '../models/Club';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function checkMembership() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    
    const user = await User.findOne({ username: 'roelsundiam' });
    if (!user) {
      console.log('❌ User not found');
      await mongoose.disconnect();
      return;
    }
    
    console.log('👤 User:', user.username, '(', user._id.toString(), ')');
    console.log('   Role:', user.role);
    console.log('   Platform Role:', user.platformRole || 'user');
    console.log('   isApproved:', user.isApproved);
    
    const club = await Club.findOne({ name: 'Suburbia' });
    if (!club) {
      console.log('❌ Suburbia club not found');
      await mongoose.disconnect();
      return;
    }
    
    console.log('\n🏢 Club:', club.name, '(', club._id.toString(), ')');
    console.log('   Status:', club.status);
    
    const membership = await ClubMembership.findOne({ 
      userId: user._id, 
      clubId: club._id 
    });
    
    if (membership) {
      console.log('\n📋 Membership found:');
      console.log('   Status:', membership.status);
      console.log('   Role:', membership.role);
      console.log('   Joined:', membership.joinedAt);
    } else {
      console.log('\n❌ No membership found for this user in Suburbia');
      
      // Check all memberships for this user
      const allMemberships = await ClubMembership.find({ userId: user._id });
      console.log('\n📋 All memberships for user:', allMemberships.length);
      for (const m of allMemberships) {
        const c = await Club.findById(m.clubId);
        console.log('   -', c?.name || 'Unknown', '- Role:', m.role, '- Status:', m.status);
      }
    }
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

checkMembership();
