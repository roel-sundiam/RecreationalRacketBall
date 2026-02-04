import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User';
import Club from '../models/Club';
import ClubMembership from '../models/ClubMembership';
import ClubSettings from '../models/ClubSettings';

dotenv.config();

const cleanupDatabase = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('✅ Connected to MongoDB');

    // Find superadmin user(s) to preserve
    const superadmins = await User.find({ role: 'superadmin' });
    const superadminIds = superadmins.map(u => u._id);
    
    console.log(`\n🛡️  Found ${superadmins.length} superadmin(s) to preserve:`);
    superadmins.forEach(admin => {
      console.log(`   - ${admin.username} (${admin.email})`);
    });

    // Delete all club memberships
    console.log('\n🗑️  Deleting all club memberships...');
    const membershipResult = await ClubMembership.deleteMany({});
    console.log(`   ✅ Deleted ${membershipResult.deletedCount} memberships`);

    // Delete all club settings
    console.log('\n🗑️  Deleting all club settings...');
    const settingsResult = await ClubSettings.deleteMany({});
    console.log(`   ✅ Deleted ${settingsResult.deletedCount} club settings`);

    // Delete all clubs
    console.log('\n🗑️  Deleting all clubs...');
    const clubsResult = await Club.deleteMany({});
    console.log(`   ✅ Deleted ${clubsResult.deletedCount} clubs`);

    // Delete all users EXCEPT superadmins
    console.log('\n🗑️  Deleting all users except superadmins...');
    const usersResult = await User.deleteMany({
      _id: { $nin: superadminIds }
    });
    console.log(`   ✅ Deleted ${usersResult.deletedCount} users`);

    console.log('\n✨ Database cleanup completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Clubs deleted: ${clubsResult.deletedCount}`);
    console.log(`   - Memberships deleted: ${membershipResult.deletedCount}`);
    console.log(`   - Club settings deleted: ${settingsResult.deletedCount}`);
    console.log(`   - Users deleted: ${usersResult.deletedCount}`);
    console.log(`   - Superadmins preserved: ${superadmins.length}`);

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

cleanupDatabase();
