import mongoose from "mongoose";
import User from "./src/models/User";
import Club from "./src/models/Club";
import ClubMembership from "./src/models/ClubMembership";
import dotenv from "dotenv";

dotenv.config();

async function checkRoelMembership() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);

    const user = await User.findOne({ username: "RoelSundiam" });
    if (!user) {
      console.log("RoelSundiam not found");
      process.exit(1);
    }

    console.log("✅ User found: RoelSundiam");
    console.log("Platform Role:", user.platformRole || user.role);
    console.log("");

    const memberships = await ClubMembership.find({ userId: user._id });
    console.log("Found", memberships.length, "club membership(s):\n");

    for (const m of memberships) {
      const club = await Club.findById(m.clubId);
      if (club) {
        console.log("📍 Club:", club.name);
        console.log("   Role:", m.role);
        console.log("   Status:", m.status);
        console.log("");
      }
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

checkRoelMembership();
