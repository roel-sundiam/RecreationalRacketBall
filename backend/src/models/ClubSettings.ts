import mongoose, { Schema, Document } from "mongoose";

export interface IClubSettings {
  _id: mongoose.Types.ObjectId;
  clubId: mongoose.Types.ObjectId;
  operatingHours: {
    start: number;
    end: number;
  };
  pricing: {
    pricingModel: "variable" | "fixed-hourly" | "fixed-daily";
    peakHourFee: number;
    offPeakHourFee: number;
    fixedHourlyFee: number;
    fixedDailyFee: number;
    guestFee: number;
    peakHours: number[];
  };
  membershipFee: {
    annual: number;
    currency: string;
  };
  initialCreditBalance: number;
  features: {
    openPlayEnabled: boolean;
    tournamentsEnabled: boolean;
    chatEnabled: boolean;
    galleryEnabled: boolean;
    rankingsEnabled: boolean;
  };
  updatedAt: Date;
  updatedBy: mongoose.Types.ObjectId;
}

export interface IClubSettingsDocument
  extends Omit<IClubSettings, "_id">, Document {
  _id: mongoose.Types.ObjectId;
}

const clubSettingsSchema = new Schema<IClubSettingsDocument>(
  {
    clubId: {
      type: Schema.Types.ObjectId,
      ref: "Club",
      required: [true, "Club ID is required"],
      unique: true,
      index: true,
    },
    operatingHours: {
      start: {
        type: Number,
        required: [true, "Operating start hour is required"],
        min: [0, "Start hour must be between 0 and 23"],
        max: [23, "Start hour must be between 0 and 23"],
        default: 5,
      },
      end: {
        type: Number,
        required: [true, "Operating end hour is required"],
        min: [0, "End hour must be between 0 and 23"],
        max: [23, "End hour must be between 0 and 23"],
        default: 22,
      },
    },
    pricing: {
      pricingModel: {
        type: String,
        enum: ["variable", "fixed-hourly", "fixed-daily"],
        required: [true, "Pricing model is required"],
        default: "variable",
      },
      peakHourFee: {
        type: Number,
        required: [true, "Peak hour fee is required"],
        min: [0, "Peak hour fee cannot be negative"],
        default: 150,
      },
      offPeakHourFee: {
        type: Number,
        required: [true, "Off-peak hour fee is required"],
        min: [0, "Off-peak hour fee cannot be negative"],
        default: 100,
      },
      fixedHourlyFee: {
        type: Number,
        required: [true, "Fixed hourly fee is required"],
        min: [0, "Fixed hourly fee cannot be negative"],
        default: 125,
      },
      fixedDailyFee: {
        type: Number,
        required: [true, "Fixed daily fee is required"],
        min: [0, "Fixed daily fee cannot be negative"],
        default: 500,
      },
      guestFee: {
        type: Number,
        required: [true, "Guest fee is required"],
        min: [0, "Guest fee cannot be negative"],
        default: 70,
      },
      peakHours: {
        type: [Number],
        default: [5, 18, 19, 20, 21],
        validate: {
          validator: function (hours: number[]) {
            return hours.every((h) => h >= 0 && h <= 23);
          },
          message: "Peak hours must be between 0 and 23",
        },
      },
    },
    membershipFee: {
      annual: {
        type: Number,
        required: [true, "Annual membership fee is required"],
        min: [0, "Annual membership fee cannot be negative"],
        default: 1000,
      },
      currency: {
        type: String,
        required: [true, "Currency is required"],
        default: "PHP",
        uppercase: true,
        minlength: 3,
        maxlength: 3,
      },
    },
    initialCreditBalance: {
      type: Number,
      required: [true, "Initial credit balance is required"],
      min: [0, "Initial credit balance cannot be negative"],
      default: 100,
    },
    features: {
      openPlayEnabled: {
        type: Boolean,
        default: true,
      },
      tournamentsEnabled: {
        type: Boolean,
        default: true,
      },
      chatEnabled: {
        type: Boolean,
        default: true,
      },
      galleryEnabled: {
        type: Boolean,
        default: true,
      },
      rankingsEnabled: {
        type: Boolean,
        default: true,
      },
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
  },
  {
    timestamps: { createdAt: false, updatedAt: true },
    toJSON: {
      transform: function (doc, ret) {
        delete (ret as any).__v;
        return ret;
      },
    },
    toObject: {
      transform: function (doc, ret) {
        delete (ret as any).__v;
        return ret;
      },
    },
  },
);

// Validation: ensure start hour is before end hour
clubSettingsSchema.pre("save", function (next) {
  const settings = this as IClubSettingsDocument;

  if (settings.operatingHours.start >= settings.operatingHours.end) {
    return next(new Error("Operating start hour must be before end hour"));
  }

  next();
});

// Static method to get settings for a club
clubSettingsSchema.statics.getByClubId = function (
  clubId: mongoose.Types.ObjectId,
) {
  return this.findOne({ clubId });
};

// Static method to create default settings for a new club
clubSettingsSchema.statics.createDefault = async function (
  clubId: mongoose.Types.ObjectId,
  updatedBy: mongoose.Types.ObjectId,
) {
  const defaultSettings = new this({
    clubId,
    updatedBy,
  });

  return defaultSettings.save();
};

const ClubSettings = mongoose.model<IClubSettingsDocument>(
  "ClubSettings",
  clubSettingsSchema,
);

export default ClubSettings;
