import mongoose from 'mongoose';
import Club from '../models/Club';
import dotenv from 'dotenv';

dotenv.config();

async function activateSuburbia() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('Connected to MongoDB\n');
    
    const club = await Club.findOne({ slug: 'suburbia' });
    if (!club) {
      console.log('Suburbia club not found');
      process.exit(1);
    }
    
    console.log('Current status:', club.status);
    club.status = 'active';
    await club.save();
    console.log('Updated status:', club.status);
    console.log('\nSuburbia is now active!');
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

activateSuburbia();
