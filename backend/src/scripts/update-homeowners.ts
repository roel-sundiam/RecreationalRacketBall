/**
 * Update Homeowner Status Script
 *
 * USAGE:
 *   npm run update-homeowners
 *
 * This script updates the isHomeowner field to true for specific members
 * in the TennisClubRT2_Test database.
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User';

// Load environment variables
dotenv.config();

// List of homeowner usernames
const homeownerUsernames: string[] = [
  'DanCastro',
  'DerekTwano',
  'EboyVillena',
  'FrenzDavid',
  'HelenSundiam',
  'HomerGallardo',
  'IsmaelPaz',
  'JadGarbes',
  'JhenCunanan',
  'LarrySantos',
  'MarivicDizon',
  'MatthewGatpolintan',
  'MervinNagun',
  'MonHenson',
  'PamAsuncion',
  'ReuelChristian',
  'RoelSundiam'
];

interface UpdateResult {
  username: string;
  fullName: string;
}

const updateHomeowners = async () => {
  try {
    console.log('🔍 Connecting to MongoDB...');

    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI not found in environment variables');
    }

    // Safety check: Ensure we're only using TennisClubRT2_Test database
    const allowedDatabase = 'TennisClubRT2_Test';
    const mongoUri = process.env.MONGODB_URI;

    // Extract database name from connection string
    const dbNameMatch = mongoUri.match(/\/([^/?]+)(\?|$)/);
    const databaseName = dbNameMatch ? dbNameMatch[1] : null;

    console.log(`📊 Target Database: ${databaseName}`);
    console.log(`✅ Allowed Database: ${allowedDatabase}\n`);

    if (databaseName !== allowedDatabase) {
      console.error('❌ ERROR: This script is configured to run ONLY on TennisClubRT2_Test database!');
      console.error(`❌ Current database in MONGODB_URI: ${databaseName}`);
      console.error(`❌ Expected database: ${allowedDatabase}`);
      console.error('\n⚠️  To protect production data, this script will NOT proceed.\n');
      process.exit(1);
    }

    console.log('✅ Database name verified: TennisClubRT2_Test');
    console.log('✅ Safe to proceed with test database\n');

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    console.log('=== Updating Homeowner Status ===\n');
    console.log(`Marking ${homeownerUsernames.length} members as homeowners...\n`);

    const updated: UpdateResult[] = [];
    const alreadyMarked: UpdateResult[] = [];
    const notFound: string[] = [];

    for (const username of homeownerUsernames) {
      const user = await User.findOne({ username });

      if (!user) {
        console.log(`⚠️  User not found: ${username}`);
        notFound.push(username);
        continue;
      }

      // Check if already a homeowner
      if (user.isHomeowner === true) {
        console.log(`ℹ️  ${user.fullName} (@${username}) - Already marked as Homeowner`);
        alreadyMarked.push({ username, fullName: user.fullName });
        continue;
      }

      // Update the user
      await User.updateOne(
        { _id: user._id },
        { $set: { isHomeowner: true } }
      );

      console.log(`✅ ${user.fullName} (@${username}) - Marked as Homeowner`);
      updated.push({ username, fullName: user.fullName });
    }

    // Display summary
    console.log('\n' + '='.repeat(60));
    console.log('=== Summary ===');
    console.log('='.repeat(60));
    console.log(`Total homeowners to mark: ${homeownerUsernames.length}`);
    console.log(`✅ Updated: ${updated.length}`);
    console.log(`ℹ️  Already marked: ${alreadyMarked.length}`);
    console.log(`⚠️  Not found: ${notFound.length}`);
    console.log('='.repeat(60));

    if (updated.length > 0) {
      console.log('\n✅ Successfully Updated:');
      updated.forEach(u => console.log(`   - ${u.fullName} (@${u.username})`));
    }

    if (alreadyMarked.length > 0) {
      console.log('\nℹ️  Already Marked as Homeowners:');
      alreadyMarked.forEach(u => console.log(`   - ${u.fullName} (@${u.username})`));
    }

    if (notFound.length > 0) {
      console.log('\n⚠️  Not Found:');
      notFound.forEach(u => console.log(`   - ${u}`));
    }

    console.log('');

  } catch (error) {
    console.error('❌ Error updating homeowners:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('📤 Disconnected from MongoDB');
  }
};

updateHomeowners();
