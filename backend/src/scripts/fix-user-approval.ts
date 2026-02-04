import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import User from '../models/User';

// Load environment variables from backend/.env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function fixUserApproval() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Connected to MongoDB');

    // Find roelsundiam user
    const user = await User.findOne({ username: 'roelsundiam' });
    
    if (!user) {
      console.log('❌ User "roelsundiam" not found');
      await mongoose.disconnect();
      return;
    }
    
    console.log('📋 Current user status:');
    console.log('  Username:', user.get('username'));
    console.log('  isApproved:', user.get('isApproved'));
    console.log('  isActive:', user.get('isActive'));
    console.log('  role:', user.get('role'));
    
    if (!user.get('isApproved')) {
      console.log('\n🔧 Re-approving user...');
      await User.updateOne(
        { _id: user._id },
        { $set: { isApproved: true } }
      );
      console.log('✅ User re-approved successfully!');
    } else {
      console.log('✅ User is already approved');
    }
    
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

fixUserApproval();
