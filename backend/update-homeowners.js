const mongoose = require('mongoose');
require('dotenv').config();

const homeownerUsernames = [
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

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  try {
    const db = mongoose.connection.db;
    const users = db.collection('users');

    console.log('=== Updating Homeowner Status ===\n');
    console.log(`Marking ${homeownerUsernames.length} members as homeowners...\n`);

    let updatedCount = 0;
    const updated = [];
    const notFound = [];

    for (const username of homeownerUsernames) {
      const user = await users.findOne({ username });

      if (!user) {
        console.log(`⚠️  User not found: ${username}`);
        notFound.push(username);
        continue;
      }

      // Update the user to set isHomeowner = true
      const result = await users.updateOne(
        { _id: user._id },
        { $set: { isHomeowner: true } }
      );

      if (result.modifiedCount > 0) {
        updatedCount++;
        console.log(`✅ ${user.fullName} (@${user.username}) - Marked as Homeowner`);
        updated.push({
          username: user.username,
          fullName: user.fullName
        });
      } else {
        console.log(`ℹ️  ${user.fullName} (@${user.username}) - Already marked as Homeowner`);
      }
    }

    console.log('\n=== Summary ===');
    console.log(`Total homeowners to mark: ${homeownerUsernames.length}`);
    console.log(`Updated: ${updatedCount}`);
    console.log(`Not found: ${notFound.length}`);

    if (notFound.length > 0) {
      console.log('\n=== Not Found ===');
      notFound.forEach(username => {
        console.log(`- ${username}`);
      });
    }

    if (updated.length > 0) {
      console.log('\n=== Successfully Updated ===');
      updated.forEach(u => {
        console.log(`- ${u.fullName} (@${u.username})`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
});
