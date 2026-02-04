import * as fs from "fs";
import * as path from "path";

const filePath = path.join(__dirname, "src", "middleware", "club.ts");
let content = fs.readFileSync(filePath, "utf-8");

// Find and replace the return statement in getUserClubsWithRoles
const oldPattern = `return memberships.map(membership => ({
      clubId: (membership.clubId as any)._id.toString(),`;

const newPattern = `return memberships.map(membership => ({
      _id: (membership._id as any).toString(),
      clubId: (membership.clubId as any)._id.toString(),`;

if (content.includes(oldPattern)) {
  content = content.replace(oldPattern, newPattern);
  fs.writeFileSync(filePath, content, "utf-8");
  console.log("✅ Added _id field to getUserClubsWithRoles");
} else {
  console.log("❌ Pattern not found in file");
  console.log("Looking for:", oldPattern.substring(0, 60));
}

// Also add missing fields if not present
if (!content.includes("membershipFeesPaid: membership.membershipFeesPaid")) {
  const oldEnd = `seedPoints: membership.seedPoints
    }));`;

  const newEnd = `seedPoints: membership.seedPoints,
      membershipFeesPaid: membership.membershipFeesPaid,
      matchesWon: membership.matchesWon || 0,
      matchesPlayed: membership.matchesPlayed || 0
    }));`;

  if (content.includes(oldEnd)) {
    content = content.replace(oldEnd, newEnd);
    fs.writeFileSync(filePath, content, "utf-8");
    console.log("✅ Added missing fields to response");
  } else {
    console.log("ℹ️ Missing fields pattern not found");
  }
} else {
  console.log("ℹ️ Missing fields already present");
}
