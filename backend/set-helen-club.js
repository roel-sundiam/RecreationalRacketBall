require("dotenv").config();
const mongoose = require("mongoose");

const uri =
  process.env.MONGODB_URI || "mongodb://localhost:27017/tennis-club-rt2-test";

async function setHelenClub() {
  try {
    await mongoose.connect(uri);
    console.log("✅ Connected to MongoDB");

    const User = mongoose.model(
      "User",
      new mongoose.Schema({}, { strict: false }),
    );
    const ClubMembership = mongoose.model(
      "ClubMembership",
      new mongoose.Schema({}, { strict: false }),
    );

    // Find Helen
    const helen = await User.findOne({ username: "HelenSundiam" });
    if (!helen) {
      console.log("❌ Helen not found");
      process.exit(1);
    }

    // Find her club membership
    const membership = await ClubMembership.findOne({
      userId: helen._id,
      status: "approved",
    });

    if (!membership) {
      console.log("❌ No approved club membership found for Helen");
      process.exit(1);
    }

    console.log("Setting selectedClubId to:", membership.clubId);

    // Update Helen's selectedClubId
    await User.updateOne(
      { _id: helen._id },
      { $set: { selectedClubId: membership.clubId } },
    );

    console.log(
      "✅ Updated HelenSundiam selectedClubId to Villa Gloria Tennis Club",
    );

    // Verify
    const updatedHelen = await User.findById(helen._id);
    console.log("\n📋 Updated User:");
    console.log("Username:", updatedHelen.username);
    console.log("Role:", updatedHelen.role);
    console.log("Selected Club ID:", updatedHelen.selectedClubId);
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\n✅ Disconnected");
  }
}

setHelenClub();
