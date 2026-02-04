import mongoose from "mongoose";
import User from "./src/models/User";
import { getUserClubsWithRoles } from "./src/middleware/club";
import dotenv from "dotenv";

dotenv.config();

async function testLoginResponse() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);

    const user = await User.findOne({ username: "RoelSundiam" });
    if (!user) {
      console.log("❌ User not found");
      process.exit(1);
    }

    console.log("✅ Testing what the login endpoint would return...\n");

    const clubs = await getUserClubsWithRoles(user._id);

    console.log("Clubs array that would be returned:");
    console.log(JSON.stringify(clubs, null, 2));

    console.log("\n✅ Each club object includes:");
    if (clubs.length > 0) {
      const firstClub = clubs[0];
      console.log("- _id:", !!firstClub._id, "value:", firstClub._id);
      console.log("- clubId:", !!firstClub.clubId);
      console.log("- role:", !!firstClub.role, "value:", firstClub.role);
      console.log("- status:", !!firstClub.status, "value:", firstClub.status);
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

testLoginResponse();
