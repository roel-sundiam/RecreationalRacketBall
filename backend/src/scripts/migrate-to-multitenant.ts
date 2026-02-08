import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Club from '../models/Club';
import ClubSettings from '../models/ClubSettings';
import ClubMembership from '../models/ClubMembership';
import User from '../models/User';

// Load environment variables
dotenv.config();

interface MigrationStats {
  clubCreated: boolean;
  clubSettingsCreated: boolean;
  usersMigrated: number;
  collectionsUpdated: string[];
  documentsUpdated: Record<string, number>;
  errors: string[];
}

const stats: MigrationStats = {
  clubCreated: false,
  clubSettingsCreated: false,
  usersMigrated: 0,
  collectionsUpdated: [],
  documentsUpdated: {},
  errors: []
};

// Default club data for Recreational Racket Ball
const DEFAULT_CLUB_DATA = {
  name: 'Recreational Racket Ball',
  slug: 'recreational-racket-ball',
  contactEmail: process.env.CONTACT_EMAIL || 'admin@tennisclubrt2.com',
  contactPhone: process.env.CONTACT_PHONE || '+63 945 123 4567',
  address: {
    street: 'Delapaz Norte',
    city: 'San Fernando',
    province: 'Pampanga',
    postalCode: '2000',
    country: 'Philippines'
  },
  coordinates: {
    latitude: parseFloat(process.env.WEATHER_LAT || '15.087'),
    longitude: parseFloat(process.env.WEATHER_LON || '120.6285')
  },
  logo: null,
  primaryColor: '#1976d2',
  accentColor: '#ff4081',
  status: 'active' as const,
  subscriptionTier: 'premium' as const
};

// Default club settings (from environment variables)
const DEFAULT_CLUB_SETTINGS = {
  operatingHours: {
    start: 5,
    end: 22
  },
  pricing: {
    peakHourFee: parseInt(process.env.PEAK_HOUR_FEE || '150'),
    offPeakHourFee: parseInt(process.env.OFF_PEAK_FEE_PER_MEMBER || '100'),
    guestFee: 70,
    peakHours: (process.env.PEAK_HOURS || '5,18,19,20,21').split(',').map(h => parseInt(h))
  },
  membershipFee: {
    annual: 1000,
    currency: 'PHP'
  },
  initialCreditBalance: parseInt(process.env.FREE_COINS_NEW_USER || '100'),
  features: {
    openPlayEnabled: true,
    tournamentsEnabled: true,
    chatEnabled: true,
    galleryEnabled: true,
    rankingsEnabled: true
  }
};

async function connectToDatabase(): Promise<void> {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB:', mongoose.connection.db?.databaseName);
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}

async function createDefaultClub(): Promise<mongoose.Types.ObjectId> {
  console.log('\n📋 Step 1: Creating default club...');

  try {
    // Check if club already exists
    const existingClub = await Club.findOne({ slug: DEFAULT_CLUB_DATA.slug });
    if (existingClub) {
      console.log('✅ Club already exists:', existingClub.name);
      stats.clubCreated = false;
      return existingClub._id;
    }

    // Find the first superadmin user to be the club owner
    const superadmin = await User.findOne({ role: 'superadmin' });
    if (!superadmin) {
      throw new Error('No superadmin user found. Please create a superadmin first.');
    }

    // Create the club
    const club = new Club({
      ...DEFAULT_CLUB_DATA,
      ownerId: superadmin._id
    });

    await club.save();
    console.log('✅ Club created successfully:', club.name, '(ID:', club._id.toString(), ')');
    stats.clubCreated = true;

    return club._id;
  } catch (error) {
    const errorMsg = `Failed to create club: ${error instanceof Error ? error.message : String(error)}`;
    console.error('❌', errorMsg);
    stats.errors.push(errorMsg);
    throw error;
  }
}

async function createDefaultClubSettings(clubId: mongoose.Types.ObjectId, updatedBy: mongoose.Types.ObjectId): Promise<void> {
  console.log('\n📋 Step 2: Creating default club settings...');

  try {
    // Check if settings already exist
    const existingSettings = await ClubSettings.findOne({ clubId });
    if (existingSettings) {
      console.log('✅ Club settings already exist');
      stats.clubSettingsCreated = false;
      return;
    }

    // Create club settings
    const settings = new ClubSettings({
      clubId,
      ...DEFAULT_CLUB_SETTINGS,
      updatedBy
    });

    await settings.save();
    console.log('✅ Club settings created successfully');
    stats.clubSettingsCreated = true;
  } catch (error) {
    const errorMsg = `Failed to create club settings: ${error instanceof Error ? error.message : String(error)}`;
    console.error('❌', errorMsg);
    stats.errors.push(errorMsg);
    throw error;
  }
}

async function migrateUsersToClubMembership(clubId: mongoose.Types.ObjectId): Promise<void> {
  console.log('\n📋 Step 3: Migrating users to ClubMembership...');

  try {
    const users = await User.find({});
    console.log(`Found ${users.length} users to migrate`);

    for (const user of users) {
      // Check if membership already exists
      const existingMembership = await ClubMembership.findOne({
        userId: user._id,
        clubId
      });

      if (existingMembership) {
        console.log(`⏭️  Skipping ${user.username} - already has membership`);
        continue;
      }

      // Map old role to new club role
      let clubRole: 'member' | 'admin' | 'treasurer' = 'member';
      if (user.role === 'admin' || user.role === 'superadmin') {
        clubRole = 'admin';
      } else if (user.role === 'treasurer') {
        clubRole = 'treasurer';
      }

      // Create club membership
      const membership = new ClubMembership({
        userId: user._id,
        clubId,
        role: clubRole,
        status: user.isApproved ? 'approved' : 'pending',
        membershipFeesPaid: user.membershipFeesPaid || false,
        membershipYearsPaid: user.membershipYearsPaid || [],
        creditBalance: user.creditBalance || 0,
        seedPoints: user.seedPoints || 0,
        matchesWon: user.matchesWon || 0,
        matchesPlayed: user.matchesPlayed || 0,
        joinedAt: user.registrationDate || user.createdAt || new Date(),
        approvedAt: user.isApproved ? (user.registrationDate || user.createdAt) : undefined
      });

      await membership.save();
      stats.usersMigrated++;
      console.log(`✅ Migrated ${user.username} as ${clubRole}`);
    }

    console.log(`✅ Successfully migrated ${stats.usersMigrated} users to ClubMembership`);
  } catch (error) {
    const errorMsg = `Failed to migrate users: ${error instanceof Error ? error.message : String(error)}`;
    console.error('❌', errorMsg);
    stats.errors.push(errorMsg);
    throw error;
  }
}

async function addClubIdToCollections(clubId: mongoose.Types.ObjectId): Promise<void> {
  console.log('\n📋 Step 4: Adding clubId to existing documents...');

  // Collections that need clubId
  const collections = [
    'reservations',
    'payments',
    'credittransactions',
    'polls',
    'announcements',
    'expenses',
    'expensecategories',
    'galleryimages',
    'suggestions',
    'tournaments',
    'players',
    'seedingpoints',
    'resurfacingcontributions',
    'chatrooms',
    'chatmessages',
    'chatparticipants',
    'courtusagereports',
    'pushsubscriptions',
    'announcementreads'
  ];

  for (const collectionName of collections) {
    try {
      const collection = mongoose.connection.db?.collection(collectionName);
      if (!collection) {
        console.log(`⏭️  Skipping ${collectionName} - collection not found`);
        continue;
      }

      // Check if collection has documents
      const count = await collection.countDocuments();
      if (count === 0) {
        console.log(`⏭️  Skipping ${collectionName} - no documents`);
        continue;
      }

      // Update all documents to add clubId
      const result = await collection.updateMany(
        { clubId: { $exists: false } },
        { $set: { clubId: clubId } }
      );

      stats.documentsUpdated[collectionName] = result.modifiedCount;
      stats.collectionsUpdated.push(collectionName);
      console.log(`✅ Updated ${result.modifiedCount} documents in ${collectionName}`);
    } catch (error) {
      const errorMsg = `Failed to update ${collectionName}: ${error instanceof Error ? error.message : String(error)}`;
      console.error('❌', errorMsg);
      stats.errors.push(errorMsg);
      // Continue with other collections
    }
  }

  console.log(`✅ Updated ${stats.collectionsUpdated.length} collections`);
}

async function updateIndexes(): Promise<void> {
  console.log('\n📋 Step 5: Updating database indexes...');

  try {
    // Note: Mongoose will automatically create new indexes when models are loaded
    // We just need to drop the old unique indexes that don't include clubId

    // Drop old reservation unique index (date, timeSlot)
    try {
      await mongoose.connection.db?.collection('reservations').dropIndex('date_1_timeSlot_1');
      console.log('✅ Dropped old reservation unique index');
    } catch (error) {
      console.log('ℹ️  Old reservation index may not exist or already dropped');
    }

    console.log('✅ Index updates completed (new indexes will be created on server restart)');
  } catch (error) {
    const errorMsg = `Failed to update indexes: ${error instanceof Error ? error.message : String(error)}`;
    console.error('❌', errorMsg);
    stats.errors.push(errorMsg);
    // Non-fatal error, continue
  }
}

async function verifyMigration(clubId: mongoose.Types.ObjectId): Promise<void> {
  console.log('\n📋 Step 6: Verifying migration...');

  try {
    // Verify club exists
    const club = await Club.findById(clubId);
    if (!club) {
      throw new Error('Club not found after migration');
    }
    console.log('✅ Club verified:', club.name);

    // Verify club settings exist
    const settings = await ClubSettings.findOne({ clubId });
    if (!settings) {
      throw new Error('Club settings not found after migration');
    }
    console.log('✅ Club settings verified');

    // Verify club memberships
    const membershipCount = await ClubMembership.countDocuments({ clubId });
    const userCount = await User.countDocuments({});
    console.log(`✅ Club memberships verified: ${membershipCount}/${userCount} users`);

    // Verify clubId in collections
    for (const collectionName of stats.collectionsUpdated) {
      const collection = mongoose.connection.db?.collection(collectionName);
      const docsWithoutClubId = await collection?.countDocuments({ clubId: { $exists: false } });
      if (docsWithoutClubId && docsWithoutClubId > 0) {
        console.warn(`⚠️  Warning: ${docsWithoutClubId} documents in ${collectionName} still missing clubId`);
      } else {
        console.log(`✅ All documents in ${collectionName} have clubId`);
      }
    }

    console.log('✅ Migration verification completed');
  } catch (error) {
    const errorMsg = `Verification failed: ${error instanceof Error ? error.message : String(error)}`;
    console.error('❌', errorMsg);
    stats.errors.push(errorMsg);
    throw error;
  }
}

function printMigrationSummary(): void {
  console.log('\n' + '='.repeat(60));
  console.log('📊 MIGRATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Club created: ${stats.clubCreated ? 'Yes' : 'Already existed'}`);
  console.log(`✅ Club settings created: ${stats.clubSettingsCreated ? 'Yes' : 'Already existed'}`);
  console.log(`✅ Users migrated to ClubMembership: ${stats.usersMigrated}`);
  console.log(`✅ Collections updated: ${stats.collectionsUpdated.length}`);
  console.log('\nDocuments updated per collection:');
  for (const [collection, count] of Object.entries(stats.documentsUpdated)) {
    console.log(`  - ${collection}: ${count} documents`);
  }

  if (stats.errors.length > 0) {
    console.log('\n⚠️  ERRORS ENCOUNTERED:');
    stats.errors.forEach(error => console.log(`  - ${error}`));
  } else {
    console.log('\n🎉 Migration completed successfully with no errors!');
  }
  console.log('='.repeat(60));
}

async function runMigration(): Promise<void> {
  try {
    console.log('🚀 Starting Multi-Tenant Migration');
    console.log('='.repeat(60));

    await connectToDatabase();

    const clubId = await createDefaultClub();
    const superadmin = await User.findOne({ role: 'superadmin' });
    if (!superadmin) {
      throw new Error('Superadmin not found');
    }

    await createDefaultClubSettings(clubId, superadmin._id);
    await migrateUsersToClubMembership(clubId);
    await addClubIdToCollections(clubId);
    await updateIndexes();
    await verifyMigration(clubId);

    printMigrationSummary();

    console.log('\n✅ Migration completed successfully!');
    console.log('⚠️  IMPORTANT: Restart your backend server to apply new indexes');
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    printMigrationSummary();
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('\n🎉 Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Migration script failed:', error);
      process.exit(1);
    });
}

export { runMigration, MigrationStats };
