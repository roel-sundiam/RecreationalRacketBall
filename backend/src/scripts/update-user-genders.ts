/**
 * Update User Genders Script
 *
 * USAGE:
 *   npm run update-user-genders
 *
 * This script updates the gender field for specific members based on
 * user-provided gender data.
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User';

// Load environment variables
dotenv.config();

// Gender mapping interface
interface GenderMapping {
  fullName: string;
  gender: 'male' | 'female';
}

// List of users to update with their correct genders
const genderUpdates: GenderMapping[] = [
  // Males (32 total)
  { fullName: 'Adrian Raphael Choi', gender: 'male' },
  { fullName: 'Carlos Naguit', gender: 'male' },
  { fullName: 'Dan Castro', gender: 'male' },
  { fullName: 'Derek Twano', gender: 'male' },
  { fullName: 'Dirk Esguerra', gender: 'male' },
  { fullName: 'Eboy Villena', gender: 'male' },
  { fullName: 'Frenz David', gender: 'male' },
  { fullName: 'Harvey David', gender: 'male' },
  { fullName: 'Homer Gallardo', gender: 'male' },
  { fullName: 'Inigo Vergara Vicencio', gender: 'male' },
  { fullName: 'Inigo Vicencio', gender: 'male' },
  { fullName: 'Ismael Dela Paz', gender: 'male' },
  { fullName: 'Jad Garbes', gender: 'male' },
  { fullName: 'Jan Carlo Albano', gender: 'male' },
  { fullName: 'Jau Timbol', gender: 'male' },
  { fullName: 'Jermin David', gender: 'male' },
  { fullName: 'Joey Espiritu', gender: 'male' },
  { fullName: 'Jomar Alfonso', gender: 'male' },
  { fullName: 'Larry Santos', gender: 'male' },
  { fullName: 'Luis Miguel Pondang', gender: 'male' },
  { fullName: 'Marky Alcantara', gender: 'male' },
  { fullName: 'Matthew Gatpolintan', gender: 'male' },
  { fullName: 'Mervin Nagun', gender: 'male' },
  { fullName: 'Miguel Naguit', gender: 'male' },
  { fullName: 'Mon Henson', gender: 'male' },
  { fullName: 'Oyet Martin', gender: 'male' },
  { fullName: 'PJ Quiazon', gender: 'male' },
  { fullName: 'Rafael Pangilinan', gender: 'male' },
  { fullName: 'Roel Sundiam', gender: 'male' },
  { fullName: 'Ron Balboa', gender: 'male' },
  { fullName: 'Super Administrator', gender: 'male' },
  { fullName: 'Vonnel Manabat', gender: 'male' },

  // Females (28 total)
  { fullName: 'APM', gender: 'female' },
  { fullName: 'Ak Vinluan', gender: 'female' },
  { fullName: 'Alyssa Mika Dianelo', gender: 'female' },
  { fullName: 'Andrea Henson', gender: 'female' },
  { fullName: 'Antonnette Tayag', gender: 'female' },
  { fullName: 'Bea Burgos-Noveras', gender: 'female' },
  { fullName: 'Bea Noveras', gender: 'female' },
  { fullName: 'Bi Angeles', gender: 'female' },
  { fullName: 'CJ Yu', gender: 'female' },
  { fullName: 'Catereena Canlas', gender: 'female' },
  { fullName: 'Chesca Vicencio', gender: 'female' },
  { fullName: 'Cie Arnz', gender: 'female' },
  { fullName: 'Elyza Manalac', gender: 'female' },
  { fullName: 'France Marie Tongol', gender: 'female' },
  { fullName: 'Helen Sundiam', gender: 'female' },
  { fullName: 'Iya Noelle Wijangco', gender: 'female' },
  { fullName: 'Jhen Cunanan', gender: 'female' },
  { fullName: 'Lea Nacu', gender: 'female' },
  { fullName: 'Louise Soliman', gender: 'female' },
  { fullName: 'Luchie Vivas', gender: 'female' },
  { fullName: 'Marivic Dizon', gender: 'female' },
  { fullName: 'Pam Asuncion', gender: 'female' },
  { fullName: 'Paula Benilde Dungo', gender: 'female' },
  { fullName: 'Pauleen Aina Sengson', gender: 'female' },
  { fullName: 'Renee Anne Pabalete', gender: 'female' },
  { fullName: 'Tinni Naguit', gender: 'female' },
  { fullName: 'Tracy Gomez-Talo', gender: 'female' },
  { fullName: 'Tracy Talo', gender: 'female' }
];

interface UpdateResult {
  fullName: string;
  username: string;
  oldGender: string;
  newGender: string;
}

interface DuplicateMatch {
  username: string;
  id: string;
  currentGender: string;
}

// Helper function to escape special regex characters
const escapeRegex = (str: string): string => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const updateUserGenders = async () => {
  try {
    console.log('🔍 Connecting to MongoDB...');

    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI not found in environment variables');
    }

    const mongoUri = process.env.MONGODB_URI;

    // Extract database name from connection string
    const dbNameMatch = mongoUri.match(/\/([^/?]+)(\?|$)/);
    const databaseName = dbNameMatch ? dbNameMatch[1] : null;

    console.log(`📊 Target Database: ${databaseName}\n`);

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get counts before update
    console.log('📊 Gender Distribution BEFORE Update:');
    const malesBefore = await User.countDocuments({ gender: 'male', deletedAt: null });
    const femalesBefore = await User.countDocuments({ gender: 'female', deletedAt: null });
    const otherBefore = await User.countDocuments({ gender: 'other', deletedAt: null });
    console.log(`   Males: ${malesBefore}`);
    console.log(`   Females: ${femalesBefore}`);
    console.log(`   Other: ${otherBefore}\n`);

    console.log('=== Updating User Genders ===\n');
    console.log(`Processing ${genderUpdates.length} gender updates...\n`);

    const updated: UpdateResult[] = [];
    const alreadyCorrect: UpdateResult[] = [];
    const duplicateMatches: Map<string, DuplicateMatch[]> = new Map();
    const notFound: string[] = [];
    const errors: Array<{ name: string; error: string }> = [];

    for (const mapping of genderUpdates) {
      try {
        // Find all users matching this name (case-insensitive)
        const escapedName = escapeRegex(mapping.fullName);
        const matches = await User.find({
          fullName: { $regex: `^${escapedName}$`, $options: 'i' },
          deletedAt: null
        });

        if (matches.length === 0) {
          console.log(`❌ User not found: ${mapping.fullName}`);
          notFound.push(mapping.fullName);
          continue;
        }

        if (matches.length > 1) {
          // Multiple matches found - flag for manual review
          console.log(`⚠️  Multiple matches found for: ${mapping.fullName} (${matches.length} users)`);
          duplicateMatches.set(mapping.fullName, matches.map(u => ({
            username: u.username,
            id: u._id.toString(),
            currentGender: u.gender
          })));
          continue;
        }

        // Single match found
        const user = matches[0];

        if (!user) {
          console.log(`❌ User not found: ${mapping.fullName}`);
          notFound.push(mapping.fullName);
          continue;
        }

        // Check if already correct
        if (user.gender === mapping.gender) {
          console.log(`ℹ️  ${user.fullName} (@${user.username}) - Already ${mapping.gender}`);
          alreadyCorrect.push({
            fullName: user.fullName,
            username: user.username,
            oldGender: user.gender,
            newGender: mapping.gender
          });
          continue;
        }

        // Update the user
        const oldGender = user.gender;
        await User.findByIdAndUpdate(
          user._id,
          { $set: { gender: mapping.gender } },
          { new: true }
        );

        console.log(`✅ ${user.fullName} (@${user.username}) - Updated from "${oldGender}" to "${mapping.gender}"`);
        updated.push({
          fullName: user.fullName,
          username: user.username,
          oldGender: oldGender,
          newGender: mapping.gender
        });

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`❌ Error updating ${mapping.fullName}:`, errorMsg);
        errors.push({ name: mapping.fullName, error: errorMsg });
      }
    }

    // Get counts after update
    console.log('\n📊 Gender Distribution AFTER Update:');
    const malesAfter = await User.countDocuments({ gender: 'male', deletedAt: null });
    const femalesAfter = await User.countDocuments({ gender: 'female', deletedAt: null });
    const otherAfter = await User.countDocuments({ gender: 'other', deletedAt: null });
    console.log(`   Males: ${malesAfter} (+${malesAfter - malesBefore})`);
    console.log(`   Females: ${femalesAfter} (+${femalesAfter - femalesBefore})`);
    console.log(`   Other: ${otherAfter} (${otherAfter - otherBefore})\n`);

    // Display summary
    console.log('='.repeat(70));
    console.log('=== SUMMARY ===');
    console.log('='.repeat(70));
    console.log(`Total to update: ${genderUpdates.length}`);
    console.log(`✅ Updated: ${updated.length}`);
    console.log(`ℹ️  Already Correct: ${alreadyCorrect.length}`);
    console.log(`⚠️  Duplicate Matches: ${duplicateMatches.size} (requires manual review)`);
    console.log(`❌ Not Found: ${notFound.length}`);
    console.log(`❌ Errors: ${errors.length}`);
    console.log('='.repeat(70));

    if (updated.length > 0) {
      console.log('\n✅ Successfully Updated:');
      updated.forEach(u => console.log(`   - ${u.fullName} (@${u.username}): "${u.oldGender}" → "${u.newGender}"`));
    }

    if (alreadyCorrect.length > 0) {
      console.log('\nℹ️  Already Correct:');
      alreadyCorrect.forEach(u => console.log(`   - ${u.fullName} (@${u.username}): ${u.oldGender}`));
    }

    if (duplicateMatches.size > 0) {
      console.log('\n⚠️  Duplicate Matches (Manual Review Required):');
      duplicateMatches.forEach((matches, name) => {
        console.log(`\n   ${name}:`);
        matches.forEach(m => console.log(`     - @${m.username} (ID: ${m.id}, current: ${m.currentGender})`));
      });
      console.log('\n   💡 To manually update duplicates, use MongoDB queries with specific IDs.');
    }

    if (notFound.length > 0) {
      console.log('\n❌ Not Found:');
      notFound.forEach(name => console.log(`   - ${name}`));
    }

    if (errors.length > 0) {
      console.log('\n❌ Errors Encountered:');
      errors.forEach(e => console.log(`   - ${e.name}: ${e.error}`));
    }

    console.log('');

  } catch (error) {
    console.error('❌ Error updating user genders:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('📤 Disconnected from MongoDB');
  }
};

updateUserGenders();
