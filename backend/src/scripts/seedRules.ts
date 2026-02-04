/**
 * Seed script to populate initial rules for Villa Gloria Tennis Club
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import Rule from "../models/Rule";
import Club from "../models/Club";
import User from "../models/User";

dotenv.config();

const seedRules = async () => {
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

    // Find admin user to be the creator
    const admin = await User.findOne({ role: "superadmin" });
    if (!admin) {
      console.error("❌ No superadmin user found");
      process.exit(1);
    }

    // Define rules for Villa Gloria
    const rules = [
      {
        title: "Reservation Policy",
        description:
          "Reservation is on per schedule basis. Only members are allowed to reserve the tennis court.",
        category: "court-usage",
        icon: "schedule",
        order: 1,
        details: [
          "Only registered members can make reservations",
          "Reservations are made on a per-hour schedule basis",
          "Members must arrive on time for their scheduled slot",
          "Gate will be open during scheduled reservation times",
        ],
      },
      {
        title: "Member Presence",
        description:
          "Member who reserved the court must be present or playing inside the court. Gate will be open for you on your scheduled time.",
        category: "conduct",
        icon: "person_pin",
        order: 2,
        details: [
          "Reserved member must be physically present on court",
          "Gate will open only during scheduled reservation time",
          "No reservations allowed without intent to play",
          "Contact admin immediately if you cannot make it",
        ],
      },
      {
        title: "Payment Policy",
        description:
          "Play first, pay after. Payment button is enabled after your reservation time passes.",
        category: "payment",
        icon: "payment",
        order: 3,
        details: [
          "Peak Hours ({peakHours}): ₱{peakHourFee} base fee",
          "Non-Peak Hours: ₱{nonPeakHourFee} base fee",
          "Guest Fee: ₱{guestFee} per guest (added to reserver's payment)",
          "Base fee is split equally among all members",
          "Only the reserver pays for guests",
          "Payment must be completed within 30 days of play",
        ],
      },
      {
        title: "Guest Policy",
        description:
          "Members may bring guests to play on reserved courts. Guests must follow all club rules and regulations.",
        category: "guest",
        icon: "group",
        order: 4,
        details: [
          "Members can bring guests to their reserved court",
          "Guest fee is ₱{guestFee} per guest per hour",
          "Only the member who reserved the court can authorize guests",
          "Guests must follow all club rules and conduct policies",
          "Guest count must match the court capacity",
        ],
      },
      {
        title: "Cancellation Policy",
        description:
          "Cancellation/reservation must be communicated through group chat.",
        category: "cancellation",
        icon: "cancel",
        order: 5,
        details: [
          "Cancellation should be made at least 12 hours before the schedule",
          "Immediate cancellation (less than 12 hours) will be charged ₱100",
          "Communicate cancellations through official group chat",
          "Repeated cancellations may result in suspension of booking privileges",
          "No refunds for no-shows",
        ],
      },
      {
        title: "Non-Payment Consequences",
        description:
          "Non-payment for 3 times will result in denial of playing inside the court and will not be given any schedule.",
        category: "payment",
        icon: "block",
        order: 6,
        details: [
          "Non-payment after 1st violation: Warning issued",
          "Non-payment after 2nd violation: Suspension of new reservations for 7 days",
          "Non-payment after 3rd violation: Complete ban from court usage until payment is made",
          "Overdue payments must be settled before new reservations can be made",
          "Payment records are monitored by club management",
        ],
      },
      {
        title: "Property Respect",
        description:
          "Rich Town 2 Club property is to be respected at all times.",
        category: "general",
        icon: "home",
        order: 7,
        details: [
          "Do not damage court facilities or equipment",
          "Keep the court and surrounding areas clean",
          "Report any maintenance issues immediately to management",
          "Use only approved equipment on the court",
          "Violators may be charged for repairs or replacement",
          "Repeated violations may result in membership termination",
        ],
      },
      {
        title: "Court Etiquette",
        description:
          "Players must maintain proper conduct and respect other court users.",
        category: "conduct",
        icon: "sports_tennis",
        order: 8,
        details: [
          "Respect other players on adjacent courts",
          "Keep noise levels at reasonable levels",
          "Do not interfere with other matches in progress",
          "Clean up after yourself when leaving the court",
          "Keep personal belongings in designated areas",
          "Abusive language or aggressive behavior will not be tolerated",
        ],
      },
      {
        title: "Operating Hours",
        description:
          "Tennis courts are available for reservation during club operating hours.",
        category: "court-usage",
        icon: "schedule",
        order: 9,
        details: [
          "Court operating hours: {operatingHoursStart}:00 AM - {operatingHoursEnd}:00 PM daily",
          "Reservations can only be made within operating hours",
          "Emergency maintenance may require temporary closure",
          "Special hours may be announced for tournaments or events",
          "Check announcements for holiday schedule changes",
        ],
      },
      {
        title: "Membership Requirements",
        description:
          "All players must be registered club members or authorized guests.",
        category: "general",
        icon: "card_membership",
        order: 10,
        details: [
          "Membership must be active and in good standing",
          "Annual membership fee is required to maintain active status",
          "Non-members can only play as guests with a member",
          "Membership renewal notifications will be sent in advance",
          "Suspended members cannot reserve or play on club courts",
        ],
      },
    ];

    // Delete existing rules for this club
    await Rule.deleteMany({ clubId: club._id });
    console.log("🗑️  Cleared existing rules for Villa Gloria");

    // Create new rules
    const createdRules = await Rule.insertMany(
      rules.map((rule) => ({
        ...rule,
        clubId: club._id,
        isActive: true,
        createdBy: admin._id,
      })),
    );

    console.log(
      `✅ Successfully seeded ${createdRules.length} rules for ${club.name}`,
    );
    console.log("📋 Rules created:");
    createdRules.forEach((rule, index) => {
      console.log(`  ${index + 1}. ${rule.title} (${rule.category})`);
    });

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding rules:", error);
    process.exit(1);
  }
};

seedRules();
