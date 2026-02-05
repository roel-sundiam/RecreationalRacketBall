import mongoose from "mongoose";
import dotenv from "dotenv";
import Club from "../models/Club";
import Payment from "../models/Payment";
import CourtUsageReport from "../models/CourtUsageReport";
import "../models/User";

dotenv.config();

const clubNamePattern = /RT2 Pickleball Club/i;

const run = async () => {
  await mongoose.connect(
    process.env.MONGODB_URI || "mongodb://localhost:27017/recreational-racketball",
  );

  const club = await Club.findOne({ name: clubNamePattern });
  if (!club) {
    console.log("CLUB_NOT_FOUND");
    await mongoose.disconnect();
    return;
  }

  const payments = await Payment.find({
    clubId: club._id,
    status: "record",
    paymentType: "court_usage",
  }).populate("userId", "fullName");

  if (!payments.length) {
    console.log("NO_RECORDED_PAYMENTS");
    await mongoose.disconnect();
    return;
  }

  const aggregate = new Map<string, Map<string, number>>();
  const meta = new Map<string, { memberName: string; year: number }>();

  for (const payment of payments) {
    const memberName = (payment.userId as any)?.fullName;
    if (!memberName) continue;

    const usageDate =
      payment.paymentDate ||
      (payment.metadata as any)?.courtUsageDate ||
      payment.createdAt ||
      new Date();

    const usage = new Date(usageDate);
    const year = usage.getFullYear();
    const monthKey = `${year}-${(usage.getMonth() + 1)
      .toString()
      .padStart(2, "0")}`;

    const key = `${memberName}||${year}`;

    if (!aggregate.has(key)) {
      aggregate.set(key, new Map());
      meta.set(key, { memberName, year });
    }

    const monthMap = aggregate.get(key)!;
    const current = monthMap.get(monthKey) || 0;
    monthMap.set(monthKey, current + (payment.amount || 0));
  }

  let updated = 0;
  for (const [key, monthMap] of aggregate.entries()) {
    const info = meta.get(key)!;
    let record = await CourtUsageReport.findOne({
      memberName: info.memberName,
      year: info.year,
    });

    if (record && record.clubId && record.clubId.toString() !== club._id.toString()) {
      continue;
    }

    if (!record) {
      record = new CourtUsageReport({
        clubId: club._id,
        memberName: info.memberName,
        year: info.year,
        monthlyAmounts: new Map(),
      });
    } else if (!record.clubId) {
      record.clubId = club._id as any;
    }

    for (const [monthKey, amount] of monthMap.entries()) {
      const current = record.monthlyAmounts?.get(monthKey) || 0;
      record.monthlyAmounts.set(monthKey, current + amount);
    }

    record.markModified("monthlyAmounts");
    await record.save();
    updated++;
  }

  console.log(`CLUB_NAME=${club.name}`);
  console.log(`PAYMENTS=${payments.length}`);
  console.log(`RECORDS_UPDATED=${updated}`);

  await mongoose.disconnect();
};

run().catch((err) => {
  console.error("ERROR", err);
  process.exit(1);
});
