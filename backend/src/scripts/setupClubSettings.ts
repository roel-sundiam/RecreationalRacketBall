/**
 * Script to verify or create club settings for Villa Gloria Tennis Club
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import ClubSettings from "../models/ClubSettings";
import Club from "../models/Club";
import User from "../models/User";

dotenv.config();

const setupClubSettings = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(
      process.env.MONGODB_URI ||
        "mongodb://localhost:27017/recreational-racketball",
    );
    console.log("✅ Connected to MongoDB");

    // Find Villa Gloria Tennis Club
    const club = await Club.findOne({ name: "Villa Gloria Tennis Club" });
    if (!club) {
      console.error("❌ Villa Gloria Tennis Club not found");
      process.exit(1);
    }
    console.log(`✅ Found club: ${club.name}`);

    // Find a superadmin user
    const admin = await User.findOne({ role: "superadmin" });
    if (!admin) {
      console.error("❌ No superadmin user found");
      process.exit(1);
    }

    // Check if settings already exist
    const existingSettings = await ClubSettings.findOne({ clubId: club._id });
    if (existingSettings) {
      console.log("✅ Club settings already exist");
      console.log("📊 Current Settings:");
      console.log(
        `  - Peak Hour Fee: ₱${existingSettings.pricing.peakHourFee}`,
      );
      console.log(
        `  - Non-Peak Hour Fee: ₱${existingSettings.pricing.offPeakHourFee}`,
      );
      console.log(`  - Guest Fee: ₱${existingSettings.pricing.guestFee}`);
      console.log(
        `  - Peak Hours: ${existingSettings.pricing.peakHours.join(", ")}`,
      );
      console.log(
        `  - Operating Hours: ${existingSettings.operatingHours.start}AM - ${existingSettings.operatingHours.end}PM`,
      );
      process.exit(0);
    }

    // Create new settings
    const settings = await ClubSettings.create({
      clubId: club._id,
      operatingHours: {
        start: 5, // 5 AM
        end: 22, // 10 PM (22:00)
      },
      pricing: {
        peakHourFee: 150,
        offPeakHourFee: 100,
        guestFee: 70,
        peakHours: [5, 18, 19, 20, 21], // 5AM, 6PM, 7PM, 8PM, 9PM
      },
      membershipFee: {
        annual: 0,
        currency: "PHP",
      },
      initialCreditBalance: 0,
      features: {
        openPlayEnabled: true,
        tournamentsEnabled: true,
        chatEnabled: true,
        galleryEnabled: true,
        rankingsEnabled: true,
      },
      createdBy: admin._id,
      updatedBy: admin._id,
    });

    console.log("✅ Club settings created successfully");
    console.log("📊 Settings:");
    console.log(`  - Peak Hour Fee: ₱${settings.pricing.peakHourFee}`);
    console.log(`  - Non-Peak Hour Fee: ₱${settings.pricing.offPeakHourFee}`);
    console.log(`  - Guest Fee: ₱${settings.pricing.guestFee}`);
    console.log(`  - Peak Hours: ${settings.pricing.peakHours.join(", ")}`);
    console.log(
      `  - Operating Hours: ${settings.operatingHours.start}AM - ${settings.operatingHours.end}PM`,
    );

    process.exit(0);
  } catch (error) {
    console.error("❌ Error setting up club settings:", error);
    process.exit(1);
  }
};

setupClubSettings();
