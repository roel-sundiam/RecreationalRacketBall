import mongoose, { Schema, Document } from 'mongoose';

export interface ISeedingPoint extends Document {
  userId: string;
  points: number;
  description: string;
  tournamentTier?: '100' | '250' | '500'; // Made optional for new tournament system
  matchId?: string;
  pollId?: string;
  source?: 'reservation' | 'open_play' | 'tournament'; // NEW: distinguish point sources
  tournamentId?: string; // NEW: reference to Tournament model
  matchIndex?: number; // NEW: which match in tournament
  isWinner?: boolean; // NEW: track if this was a winning performance for proper reversal
  createdAt: Date;
  updatedAt: Date;
}

const seedingPointSchema = new Schema<ISeedingPoint>({
  userId: {
    type: String,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  points: {
    type: Number,
    required: [true, 'Points value is required'],
    min: [1, 'Points must be positive']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: [200, 'Description cannot exceed 200 characters'],
    trim: true
  },
  tournamentTier: {
    type: String,
    enum: {
      values: ['100', '250', '500'],
      message: 'Tournament tier must be 100, 250, or 500'
    },
    required: false, // Made optional for new tournament system
    index: true
  },
  matchId: {
    type: String,
    required: false,
    sparse: true
  },
  pollId: {
    type: String,
    ref: 'Poll',
    required: false,
    sparse: true
  },
  source: {
    type: String,
    enum: {
      values: ['reservation', 'open_play', 'tournament'],
      message: 'Source must be reservation, open_play, or tournament'
    },
    required: false,
    index: true
  },
  tournamentId: {
    type: String,
    ref: 'Tournament',
    required: false,
    sparse: true,
    index: true
  },
  matchIndex: {
    type: Number,
    required: false,
    min: [0, 'Match index cannot be negative']
  },
  isWinner: {
    type: Boolean,
    required: false,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes for efficient queries
seedingPointSchema.index({ userId: 1, createdAt: -1 });
seedingPointSchema.index({ tournamentTier: 1, createdAt: -1 });
seedingPointSchema.index({ pollId: 1, userId: 1 });
seedingPointSchema.index({ source: 1, createdAt: -1 });
seedingPointSchema.index({ tournamentId: 1, matchIndex: 1 });

// Virtual for formatted description
seedingPointSchema.virtual('formattedDescription').get(function(this: ISeedingPoint) {
  return `+${this.points} pts - ${this.description}`;
});

const SeedingPoint = mongoose.model<ISeedingPoint>('SeedingPoint', seedingPointSchema);

export default SeedingPoint;