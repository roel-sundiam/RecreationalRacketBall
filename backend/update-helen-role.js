require("dotenv").config();
const mongoose = require("mongoose");

const uri =
  process.env.MONGODB_URI || "mongodb://localhost:27017/tennis-club-rt2-test";

async function updateHelen() {
  try {
    await mongoose.connect(uri);
    console.log("✅ Connected to MongoDB");

    const User = mongoose.model(
      "User",
      new mongoose.Schema({}, { strict: false }),
    );

    const result = await User.updateOne(
      { username: "HelenSundiam" },
      { $set: { role: "treasurer" } },
    );

    console.log("\n📝 Update result:", result);

    const updatedUser = await User.findOne({ username: "HelenSundiam" }).select(
      "username firstName lastName email role clubRole",
    );

    console.log("\n✅ Updated user:");
    console.log("Username:", updatedUser.username);
    console.log("Email:", updatedUser.email);
    console.log("Role:", updatedUser.role);
    console.log("Club Role:", updatedUser.clubRole);
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\n✅ Disconnected");
  }
}

updateHelen();
