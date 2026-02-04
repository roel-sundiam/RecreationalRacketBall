import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User';
import Club from '../models/Club';
import ClubMembership from '../models/ClubMembership';

dotenv.config();

const resetClubForReapproval = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('✅ Connected to MongoDB');

    // Find RoelSundiam's user account
    const user = await User.findOne({ username: 'RoelSundiam' });
    if (!user) {
      console.log('❌ User RoelSundiam not found');
      await mongoose.disconnect();
      process.exit(1);
    }

    console.log(`\n📋 Found user: ${user.username}`);
    console.log(`   Current status: isApproved=${user.isApproved}, isActive=${user.isActive}`);

    // Find clubs owned by this user
    const clubs = await Club.find({ ownerId: user._id });
    console.log(`\n🏢 Found ${clubs.length} club(s) owned by ${user.username}:`);

    for (const club of clubs) {
      console.log(`\n   Club: ${club.name}`);
      console.log(`   Current status: ${club.status}`);
      console.log(`   Sport: ${club.sport}`);

      // Reset club to trial status
      club.status = 'trial';
      await club.save();
      console.log(`   ✅ Club status changed to: trial`);

      // Find and reset membership status
      const membership = await ClubMembership.findOne({
        clubId: club._id,
        userId: user._id
      });

      if (membership) {
        console.log(`   Membership current status: ${membership.status}`);
        membership.status = 'pending';
        membership.approvedAt = undefined;
        membership.approvedBy = undefined;
        await membership.save();
        console.log(`   ✅ Membership status changed to: pending`);
      }

      // Reset user approval status
      user.isApproved = false;
      user.isActive = false;
      await user.save();
      console.log(`   ✅ User account reset to pending approval`);
    }

    console.log('\n✨ Reset complete! The club will now appear in /admin/pending-clubs');
    console.log('   Superadmin can now re-approve with the fixed approval logic.');

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during reset:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

resetClubForReapproval();
