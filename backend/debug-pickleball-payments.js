const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

async function debugPickleballPayments() {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI ||
        "mongodb://localhost:27017/recreational-racketball",
    );
    console.log("✅ Connected to MongoDB");

    const db = mongoose.connection.db;

    // Find RT2 Pickleball Club
    const club = await db
      .collection("clubs")
      .findOne({ name: /RT2 Pickleball/i });
    if (!club) {
      console.log("❌ RT2 Pickleball Club not found");
      await mongoose.disconnect();
      return;
    }

    console.log(`\n🏓 Found club: ${club.name} (ID: ${club._id})`);

    // Get only completed payments for this club
    const completedPayments = await db
      .collection("payments")
      .find({
        clubId: club._id,
        status: "completed",
      })
      .toArray();

    console.log(
      `\n📊 Completed payments for club: ${completedPayments.length}`,
    );

    completedPayments.forEach((p, i) => {
      console.log(`\n${i + 1}. Payment Details:`);
      console.log(`   ID: ${p._id}`);
      console.log(`   Amount: ₱${p.amount}`);
      console.log(`   Status: ${p.status}`);
      console.log(`   Created: ${p.createdAt}`);
      console.log(`   Club ID: ${p.clubId}`);
      console.log(`   User ID: ${p.userId}`);
      console.log(`   Reservation ID: ${p.reservationId}`);
      console.log(
        `   Full doc: ${JSON.stringify(p, null, 2).substring(0, 500)}...`,
      );
    });

    // Now simulate what getPayments API would return
    console.log(`\n\n📡 Simulating API call with clubId filter...`);
    const apiParams = { clubId: club._id, status: "completed" };
    const apiPayments = await db
      .collection("payments")
      .find(apiParams)
      .limit(100)
      .toArray();

    console.log(
      `✅ API would return: ${apiPayments.length} completed payments`,
    );

    await mongoose.disconnect();
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

debugPickleballPayments();
