import mongoose from 'mongoose';
import User from '../models/User';
import dotenv from 'dotenv';

dotenv.config();

async function approveUser() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('Connected to MongoDB');
    
    const user = await User.findOne({ username: 'christophersundiam' });
    if (!user) {
      console.log('User not found');
      process.exit(1);
    }
    
    console.log('Current status:', {
      username: user.username,
      isApproved: user.isApproved,
      isActive: user.isActive
    });
    
    user.isApproved = true;
    user.isActive = true;
    await user.save();
    
    console.log('✅ User approved successfully');
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

approveUser();
