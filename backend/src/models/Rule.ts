import mongoose, { Schema, Document } from "mongoose";

export interface IRule {
  _id: mongoose.Types.ObjectId;
  clubId: mongoose.Types.ObjectId;
  title: string;
  description: string;
  category:
    | "general"
    | "payment"
    | "cancellation"
    | "conduct"
    | "court-usage"
    | "guest"
    | "other";
  icon: string;
  order: number;
  isActive: boolean;
  details?: string[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
}

export interface IRuleDocument extends Omit<IRule, "_id">, Document {
  _id: mongoose.Types.ObjectId;
}

const ruleSchema = new Schema<IRuleDocument>(
  {
    clubId: {
      type: Schema.Types.ObjectId,
      ref: "Club",
      required: [true, "Club ID is required"],
      index: true,
    },
    title: {
      type: String,
      required: [true, "Rule title is required"],
      trim: true,
      minlength: [5, "Title must be at least 5 characters"],
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    description: {
      type: String,
      required: [true, "Rule description is required"],
      trim: true,
      minlength: [10, "Description must be at least 10 characters"],
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: {
        values: [
          "general",
          "payment",
          "cancellation",
          "conduct",
          "court-usage",
          "guest",
          "other",
        ],
        message:
          "Category must be one of: general, payment, cancellation, conduct, court-usage, guest, other",
      },
      default: "general",
    },
    icon: {
      type: String,
      required: [true, "Icon is required"],
      default: "info",
    },
    order: {
      type: Number,
      default: 0,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    details: {
      type: [String],
      default: [],
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Creator ID is required"],
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
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

// Compound index for efficient queries
ruleSchema.index({ clubId: 1, isActive: 1, order: 1 });

// Static method to find active rules for a club
ruleSchema.statics.findActiveRules = function (
  clubId: mongoose.Types.ObjectId,
) {
  return this.find({
    clubId,
    isActive: true,
  }).sort({ order: 1, createdAt: -1 });
};

const Rule = mongoose.model<IRuleDocument>("Rule", ruleSchema);

export default Rule;
