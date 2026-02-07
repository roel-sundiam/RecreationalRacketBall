import mongoose, { Schema, Document } from "mongoose";
import { CourtReservation as ICourtReservation } from "../types/index";
import { PricingService } from "../services/pricingService";

export interface IReservationDocument
  extends Omit<ICourtReservation, "_id">, Document {
  blockReason?: "maintenance" | "private_event" | "weather" | "other";
  blockNotes?: string;
}

const reservationSchema = new Schema<IReservationDocument>(
  {
    clubId: {
      type: Schema.Types.ObjectId,
      ref: "Club",
      required: [true, "Club ID is required"],
      index: true,
    },
    userId: {
      type: String,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },
    date: {
      type: Date,
      required: [true, "Reservation date is required"],
      validate: {
        validator: function (v: Date) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          return v >= today;
        },
        message: "Reservation date cannot be in the past",
      },
    },
    timeSlot: {
      type: Number,
      required: [true, "Time slot is required"],
      min: [0, "Time slot must be between 0 and 23"],
      max: [23, "Time slot must be between 0 and 23"],
      // Note: Operating hours validation happens in pre-save hook using club-specific settings
    },
    players: [
      {
        type: Schema.Types.Mixed, // Support both String (old format) and Object (new format with member/guest tracking)
        required: true,
      },
    ],
    paymentIds: [
      {
        type: String,
        ref: "Payment",
      },
    ], // December 2025: Track multiple payment IDs (one per member)
    status: {
      type: String,
      enum: {
        values: [
          "pending",
          "confirmed",
          "cancelled",
          "completed",
          "no-show",
          "blocked",
        ],
        message:
          "Status must be pending, confirmed, cancelled, completed, no-show, or blocked",
      },
      default: "pending",
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: {
        values: ["pending", "paid", "overdue", "not_applicable"],
        message:
          "Payment status must be pending, paid, overdue, or not_applicable",
      },
      default: "pending",
      index: true,
    },
    blockReason: {
      type: String,
      enum: {
        values: ["maintenance", "private_event", "weather", "other"],
        message:
          "Block reason must be maintenance, private_event, weather, or other",
      },
    },
    blockNotes: {
      type: String,
      trim: true,
      maxlength: [200, "Block notes cannot exceed 200 characters"],
    },
    totalFee: {
      type: Number,
      min: [0, "Total fee cannot be negative"],
      default: 0,
    },
    weatherForecast: {
      temperature: { type: Number },
      description: { type: String },
      humidity: { type: Number },
      windSpeed: { type: Number },
      icon: { type: String },
      rainChance: { type: Number }, // Precipitation probability as percentage
      timestamp: { type: Date },
      lastFetched: { type: Date }, // When weather was last updated
      isMockData: { type: Boolean, default: false }, // Flag for mock/sample data
    },
    tournamentTier: {
      type: String,
      enum: {
        values: ["100", "250", "500"],
        message: "Tournament tier must be 100, 250, or 500",
      },
      default: "100",
      index: true,
    },
    matchResults: [
      {
        winnerId: {
          type: String,
          ref: "User",
          required: true,
        },
        participants: [
          {
            type: String,
            ref: "User",
            required: true,
          },
        ],
        score: {
          type: String,
          trim: true,
        },
      },
    ],
    pointsProcessed: {
      type: Boolean,
      default: false,
      index: true,
    },
    // Multi-hour reservation support
    duration: {
      type: Number,
      min: [1, "Duration must be at least 1 hour"],
      max: [12, "Duration cannot exceed 12 hours"], // Allow up to 12 for blocked reservations
      default: 1,
      required: true,
      index: true,
    },
    endTimeSlot: {
      type: Number,
      min: [6, "End time cannot be before 6 AM"],
      max: [23, "End time cannot be after 11 PM"],
      index: true,
    },
    isMultiHour: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Compound indexes for better query performance (club-scoped)
reservationSchema.index({ clubId: 1, userId: 1, date: -1 });
reservationSchema.index({ clubId: 1, date: 1, timeSlot: 1, endTimeSlot: 1 }); // Multi-hour support
reservationSchema.index({ clubId: 1, status: 1, paymentStatus: 1 });
reservationSchema.index({ clubId: 1, date: 1, status: 1 });
reservationSchema.index({ clubId: 1, tournamentTier: 1, status: 1 });
reservationSchema.index({ clubId: 1, pointsProcessed: 1, status: 1 });
reservationSchema.index({ clubId: 1, isMultiHour: 1, status: 1 }); // Multi-hour queries

// Unique compound index to prevent double booking (per club)
reservationSchema.index(
  { clubId: 1, date: 1, timeSlot: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ["pending", "confirmed", "blocked"] },
    },
  },
);

// Pre-save middleware to calculate derived fields and total fee
reservationSchema.pre("save", async function () {
  const reservation = this;

  // Validate clubId is present
  if (!reservation.clubId) {
    throw new Error("Club ID is required for reservation");
  }

  // Get club-specific settings (includes operating hours and pricing)
  const settings = await PricingService.getClubSettings(reservation.clubId);
  const { start: courtStart, end: courtEnd } = settings.operatingHours;

  // Calculate endTimeSlot and isMultiHour
  if (
    reservation.isNew ||
    reservation.isModified("timeSlot") ||
    reservation.isModified("duration")
  ) {
    reservation.endTimeSlot = reservation.timeSlot + reservation.duration;
    reservation.isMultiHour = reservation.duration > 1;

    // Validate timeSlot is within operating hours
    // Note: courtEnd is the closing hour, so last bookable slot is courtEnd - 1
    if (reservation.timeSlot < courtStart) {
      throw new Error(
        `Court opens at ${courtStart}:00 (${courtStart === 0 ? "12 AM" : courtStart < 12 ? courtStart + " AM" : courtStart === 12 ? "12 PM" : courtStart - 12 + " PM"}). Selected time: ${reservation.timeSlot}:00`,
      );
    }
    if (reservation.timeSlot >= courtEnd) {
      throw new Error(
        `Court closes at ${courtEnd}:00. Last bookable slot is ${courtEnd - 1}:00 (${courtEnd - 1 === 0 ? "12 AM" : courtEnd - 1 < 12 ? courtEnd - 1 + " AM" : courtEnd - 1 === 12 ? "12 PM" : courtEnd - 1 - 12 + " PM"}). Selected time: ${reservation.timeSlot}:00`,
      );
    }

    // Validate that booking doesn't extend beyond court hours
    if (reservation.endTimeSlot > courtEnd + 1) {
      throw new Error(
        `Booking extends beyond court hours. Court closes at ${courtEnd}:00. Duration: ${reservation.duration} hours from ${reservation.timeSlot}:00 would end at ${reservation.endTimeSlot}:00.`,
      );
    }
  }

  // Calculate total fee for multi-hour reservations if not explicitly provided
  if (
    (reservation.isNew ||
      reservation.isModified("timeSlot") ||
      reservation.isModified("players") ||
      reservation.isModified("duration")) &&
    (!reservation.totalFee || reservation.totalFee === 0)
  ) {
    // Use pricing from settings already fetched above
    const peakHours = settings.pricing.peakHours;

    // Check if players use new format (objects with isMember/isGuest)
    const hasNewPlayerFormat =
      reservation.players.length > 0 &&
      typeof reservation.players[0] === "object" &&
      "isMember" in (reservation.players[0] as any);

    let totalFee = 0;

    if (hasNewPlayerFormat) {
      // December 2025+ pricing: Club-specific pricing models
      const pricingModel = settings.pricing.pricingModel || "variable";
      const PEAK_BASE_FEE = settings.pricing.peakHourFee;
      const NON_PEAK_BASE_FEE = settings.pricing.offPeakHourFee;
      const FIXED_HOURLY_FEE = settings.pricing.fixedHourlyFee;
      const FIXED_DAILY_FEE = settings.pricing.fixedDailyFee;
      const GUEST_FEE = settings.pricing.guestFee;

      // Count members and guests
      let memberCount = 0;
      let guestCount = 0;

      for (const player of reservation.players) {
        const p = player as any;
        if (p.isMember) memberCount++;
        if (p.isGuest) guestCount++;
      }

      const calculatedEndTimeSlot =
        reservation.endTimeSlot || reservation.timeSlot + reservation.duration;
      const durationHours = calculatedEndTimeSlot - reservation.timeSlot;

      if (pricingModel === "fixed-daily") {
        totalFee = FIXED_DAILY_FEE * memberCount + guestCount * GUEST_FEE;
      } else if (pricingModel === "fixed-hourly") {
        const baseFee = FIXED_HOURLY_FEE * durationHours;
        const guestFeeTotal = guestCount * GUEST_FEE * durationHours;
        totalFee = baseFee + guestFeeTotal;
      } else {
        // Variable pricing (peak/off-peak)
        for (
          let hour = reservation.timeSlot;
          hour < calculatedEndTimeSlot;
          hour++
        ) {
          const isPeakHour = peakHours.includes(hour);
          const baseFee = isPeakHour ? PEAK_BASE_FEE : NON_PEAK_BASE_FEE;
          const hourFee = baseFee + guestCount * GUEST_FEE;
          totalFee += hourFee;
        }
      }
    } else {
      // Legacy pricing (pre-December 2025)
      const peakHourFee = parseInt(process.env.PEAK_HOUR_FEE || "100");
      const offPeakFeePerMember = parseInt(
        process.env.OFF_PEAK_FEE_PER_MEMBER || "20",
      );
      const offPeakFeePerNonMember = parseInt(
        process.env.OFF_PEAK_FEE_PER_NON_MEMBER || "50",
      );

      // Calculate fee for each hour in the duration
      const calculatedEndTimeSlot =
        reservation.endTimeSlot || reservation.timeSlot + reservation.duration;
      for (
        let hour = reservation.timeSlot;
        hour < calculatedEndTimeSlot;
        hour++
      ) {
        let hourFee = 0;

        if (peakHours.includes(hour)) {
          // Peak hours: 100 pesos fixed fee per hour
          hourFee = peakHourFee;
        } else {
          // Off-peak hours: use proper member/non-member calculation if frontend didn't provide
          // This is a fallback - the frontend should handle proper categorization
          try {
            // Simple heuristic: assume 2/3 are members, 1/3 are non-members for mixed groups
            const totalPlayers = reservation.players.length;
            if (totalPlayers <= 2) {
              // Small groups: assume all members
              hourFee = totalPlayers * offPeakFeePerMember;
            } else {
              // Larger groups: use heuristic for mixed member/non-member pricing
              const estimatedMembers = Math.ceil(totalPlayers * 0.67); // 67% members
              const estimatedNonMembers = totalPlayers - estimatedMembers;
              hourFee =
                estimatedMembers * offPeakFeePerMember +
                estimatedNonMembers * offPeakFeePerNonMember;
            }
          } catch (error) {
            // Ultimate fallback: treat all as members
            hourFee = reservation.players.length * offPeakFeePerMember;
          }
        }

        totalFee += hourFee;
      }
    }

    // Round to nearest 10 pesos (e.g., 183.33 → 190)
    reservation.totalFee = Math.ceil(totalFee / 10) * 10;
  }
});

// Static method to check if a range of slots is available (for multi-hour reservations)
reservationSchema.statics.isSlotRangeAvailable = async function (
  date: Date,
  startTimeSlot: number,
  endTimeSlot: number,
  excludeId?: string,
  clubId?: string,
) {
  // Check for any existing reservations that would conflict with the requested range
  const query: any = {
    date: date,
    status: { $in: ["pending", "confirmed", "blocked"] },
    $or: [
      // Case 1: Existing reservation starts within our requested range
      {
        timeSlot: { $gte: startTimeSlot, $lt: endTimeSlot },
      },
      // Case 2: Existing reservation ends within our requested range
      {
        endTimeSlot: { $gt: startTimeSlot, $lte: endTimeSlot },
      },
      // Case 3: Existing reservation completely contains our requested range
      {
        timeSlot: { $lte: startTimeSlot },
        endTimeSlot: { $gte: endTimeSlot },
      },
    ],
  };

  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  if (clubId) {
    query.clubId = clubId;
  }

  const conflictingReservations = await this.find(query);
  return conflictingReservations.length === 0;
};

// Static method to check if slot is available (backward compatible)
reservationSchema.statics.isSlotAvailable = async function (
  date: Date,
  timeSlot: number,
  excludeId?: string,
  clubId?: string,
) {
  return await (this as any).isSlotRangeAvailable(
    date,
    timeSlot,
    timeSlot + 1,
    excludeId,
    clubId,
  );
};

// Static method to get reservations for a specific date
reservationSchema.statics.getReservationsForDate = async function (
  date: Date,
  clubId?: string,
) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  try {
    const query: any = {
      date: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
    };

    // Add clubId filter if provided
    if (clubId) {
      query.clubId = clubId;
      console.log(`🔍 RESERVATION QUERY: Filtering by clubId: ${clubId}`);
    }

    const reservations = await this.find(query)
      .populate("userId", "username fullName")
      .sort({ timeSlot: 1 });

    return reservations || [];
  } catch (error) {
    console.error("Error fetching reservations for date:", error);
    return [];
  }
};

// Virtual for formatted date
reservationSchema.virtual("formattedDate").get(function (
  this: IReservationDocument,
) {
  return this.date.toISOString().split("T")[0];
});

// Virtual for time slot display (supports multi-hour)
reservationSchema.virtual("timeSlotDisplay").get(function (
  this: IReservationDocument,
) {
  const startHour = this.timeSlot;
  const endHour = this.endTimeSlot || startHour + 1; // Fallback for backward compatibility
  return `${startHour}:00 - ${endHour}:00`;
});

// Virtual for fee per player
reservationSchema.virtual("feePerPlayer").get(function (
  this: IReservationDocument,
) {
  if (this.players.length === 0) return 0;
  return this.totalFee / this.players.length;
});

const Reservation = mongoose.model<IReservationDocument>(
  "Reservation",
  reservationSchema,
);

export default Reservation;
