import mongoose from 'mongoose';
import Club from '../models/Club';
import dotenv from 'dotenv';

dotenv.config();

async function checkAllClubs() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('Connected to MongoDB\n');
    
    const allClubs = await Club.find({});
    console.log('Total clubs in database:', allClubs.length);
    console.log('');
    
    allClubs.forEach((club, i) => {
      console.log('Club #' + (i + 1));
      console.log('  Name:', club.name);
      console.log('  Slug:', club.slug);
      console.log('  Status:', club.status);
      console.log('  ID:', club._id.toString());
      console.log('');
    });
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkAllClubs();
