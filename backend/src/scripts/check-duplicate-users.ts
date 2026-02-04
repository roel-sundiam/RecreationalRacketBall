import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import User from '../models/User';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function checkDuplicates() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    
    const users = await User.find({ username: 'roelsundiam' });
    
    console.log('Found', users.length, 'user(s) with username "roelsundiam"');
    
    for (const user of users) {
      console.log('\n--- User Record ---');
      console.log('_id:', user._id.toString());
      console.log('username:', user.username);
      console.log('email:', user.email);
      console.log('isApproved:', user.isApproved);
      console.log('isActive:', user.isActive);
      console.log('role:', user.role);
      console.log('platformRole:', user.platformRole || 'user');
      console.log('createdAt:', user.createdAt);
    }
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

checkDuplicates();
