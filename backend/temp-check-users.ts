import mongoose from "mongoose";
import User from "./src/models/User";
import dotenv from "dotenv";

dotenv.config();

async function checkUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    const users = await User.find({})
      .select("username _id platformRole")
      .limit(20);
    console.log("Total users in DB:", users.length);
    users.forEach((u) => {
      console.log(`- ${u.username} (${u.platformRole})`);
    });
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

checkUsers();
