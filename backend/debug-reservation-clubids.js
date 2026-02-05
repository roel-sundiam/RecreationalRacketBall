const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI).then(async () => {
  console.log('✅ Connected to MongoDB');

  const db = mongoose.connection.db;
  const reservations = db.collection('reservations');

  // Get first 5 reservations with their clubId
  const results = await reservations.find({}, { projection: { _id: 1, clubId: 1, date: 1, timeSlot: 1 } }).limit(10).toArray();

  console.log('\n📋 First 10 Reservations:');
  results.forEach(r => {
    console.log(`  ID: ${r._id}, ClubId: ${r.clubId}, Date: ${r.date}, TimeSlot: ${r.timeSlot}`);
  });

  // Count by clubId
  const stats = await reservations.aggregate([
    {
      $group: {
        _id: '$clubId',
        count: { $sum: 1 }
      }
    }
  ]).toArray();

  console.log('\n📊 Reservations grouped by clubId:');
  stats.forEach(s => {
    console.log(`  ClubId: ${s._id}, Count: ${s.count}`);
  });

  process.exit(0);
}).catch(err => {
  console.error('❌ Connection failed:', err);
  process.exit(1);
});
