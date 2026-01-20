import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ExpenseCategory from '../models/ExpenseCategory';
import User from '../models/User';

// Load environment variables
dotenv.config();

const predefinedCategories = [
  {
    name: 'App Service Fee',
    description: 'Fees for application hosting and cloud services',
    displayOrder: 1
  },
  {
    name: 'Court Maintenance',
    description: 'Regular maintenance and repairs for tennis courts',
    displayOrder: 2
  },
  {
    name: 'Court Service',
    description: 'Court service and cleaning expenses',
    displayOrder: 3
  },
  {
    name: 'Delivery Fee',
    description: 'Delivery charges for supplies and equipment',
    displayOrder: 4
  },
  {
    name: 'Financial Donation',
    description: 'Donations and charitable contributions',
    displayOrder: 5
  },
  {
    name: 'Mineral Water',
    description: 'Purchase of mineral water for club members',
    displayOrder: 6
  },
  {
    name: 'Purchase - Lights',
    description: 'Purchase and installation of court lighting',
    displayOrder: 7
  },
  {
    name: 'Purchase - Miscellaneous',
    description: 'Miscellaneous purchases and supplies',
    displayOrder: 8
  },
  {
    name: 'Purchase - Tennis Net',
    description: 'Purchase of tennis nets and net equipment',
    displayOrder: 9
  },
  {
    name: 'RT Club T-Shirts',
    description: 'RT Club branded t-shirts for members',
    displayOrder: 10
  },
  {
    name: 'Tennis Score Board',
    description: 'Score boards and scoring equipment',
    displayOrder: 11
  },
  {
    name: 'Tournament Expense',
    description: 'Expenses related to organizing tournaments',
    displayOrder: 12
  },
  {
    name: 'Water System Project Expense',
    description: 'Water system installation and maintenance',
    displayOrder: 13
  }
];

async function seedExpenseCategories() {
  try {
    console.log('🌱 Starting Expense Category seed script...');

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Check if ExpenseCategory collection already has data
    const existingCount = await ExpenseCategory.countDocuments();

    if (existingCount > 0) {
      console.log(`⚠️  ExpenseCategory collection already has ${existingCount} entries. Skipping seed.`);
      console.log('💡 To re-seed, manually delete the collection first.');
      process.exit(0);
    }

    // Find a superadmin to use as createdBy
    const superadmin = await User.findOne({ role: 'superadmin' });

    if (!superadmin) {
      console.error('❌ No superadmin found. Please create a superadmin first using npm run create-superadmin');
      process.exit(1);
    }

    console.log(`👤 Using superadmin: ${superadmin.username} as creator`);

    // Insert all categories
    const categoriesToInsert = predefinedCategories.map(cat => ({
      ...cat,
      isActive: true,
      createdBy: superadmin._id
    }));

    const result = await ExpenseCategory.insertMany(categoriesToInsert);

    console.log(`✅ Successfully seeded ${result.length} expense categories:`);
    result.forEach((cat, index) => {
      console.log(`   ${index + 1}. ${cat.name}`);
    });

    console.log('\n🎉 Seed completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error seeding expense categories:', error);
    process.exit(1);
  }
}

// Run the seed function
seedExpenseCategories();

export default seedExpenseCategories;
