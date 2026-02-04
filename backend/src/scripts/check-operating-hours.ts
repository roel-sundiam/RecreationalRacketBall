import mongoose from 'mongoose';
import Club from '../models/Club';
import ClubSettings from '../models/ClubSettings';
import dotenv from 'dotenv';

dotenv.config();

async function checkOperatingHours() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    
    const clubs = await Club.find({});
    
    for (const club of clubs) {
      const settings = await ClubSettings.findOne({ clubId: club._id });
      console.log('Club:', club.name);
      console.log('  Operating Hours:', settings?.operatingHours);
      console.log('  Start:', settings?.operatingHours?.start);
      console.log('  End:', settings?.operatingHours?.end);
      console.log('');
    }
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkOperatingHours();
