import mongoose from 'mongoose';
import Club from '../models/Club';
import ClubSettings from '../models/ClubSettings';
import ClubMembership from '../models/ClubMembership';
import dotenv from 'dotenv';

dotenv.config();

async function checkSuburbiaDetails() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    
    const club = await Club.findOne({ slug: 'suburbia' });
    if (!club) {
      console.log('Suburbia not found');
      process.exit(1);
    }
    
    const settings = await ClubSettings.findOne({ clubId: club._id });
    const memberCount = await ClubMembership.countDocuments({ 
      clubId: club._id, 
      status: 'approved' 
    });
    
    console.log('CLUB INFO:');
    console.log('  Name:', club.name);
    console.log('  Address:');
    console.log('    Street:', club.address?.street);
    console.log('    City:', club.address?.city);
    console.log('    Province:', club.address?.province);
    console.log('    Postal Code:', club.address?.postalCode);
    console.log('');
    
    console.log('SETTINGS:');
    if (settings) {
      console.log('  Membership Fee:', settings.membershipFee?.annual, settings.membershipFee?.currency);
      console.log('  Operating Hours:', settings.operatingHours?.start + ':00 -', settings.operatingHours?.end + ':00');
      console.log('  Pricing:');
      console.log('    Peak Hour Fee:', settings.pricing?.peakHourFee);
      console.log('    Off-Peak Fee:', settings.pricing?.offPeakHourFee);
      console.log('    Guest Fee:', settings.pricing?.guestFee);
    } else {
      console.log('  No settings found');
    }
    console.log('');
    
    console.log('MEMBERS:');
    console.log('  Approved members:', memberCount);
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkSuburbiaDetails();
