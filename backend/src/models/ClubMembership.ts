import mongoose, { Schema, Document } from 'mongoose';

export interface IMedal {
  type: 'gold' | 'silver' | 'bronze';
  tournamentName?: string;
  awardedAt: Date;
}

export interface IClubMembership {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  clubId: mongoose.Types.ObjectId;
  role: 'member' | 'admin' | 'treasurer';
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  membershipFeesPaid: boolean;
  membershipYearsPaid: number[];
  creditBalance: number;
  seedPoints: number;
  matchesWon: number;
  matchesPlayed: number;
  medals: IMedal[];
  joinedAt: Date;
  approvedAt?: Date;
  approvedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IClubMembershipDocument extends Omit<IClubMembership, '_id'>, Document {
  _id: mongoose.Types.ObjectId;
}

const clubMembershipSchema = new Schema<IClubMembershipDocument>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  clubId: {
    type: Schema.Types.ObjectId,
    ref: 'Club',
    required: [true, 'Club ID is required'],
    index: true
  },
  role: {
    type: String,
    enum: {
      values: ['member', 'admin', 'treasurer'],
      message: 'Role must be member, admin, or treasurer'
    },
    default: 'member',
    index: true
  },
  status: {
    type: String,
    enum: {
      values: ['pending', 'approved', 'rejected', 'suspended'],
      message: 'Status must be pending, approved, rejected, or suspended'
    },
    default: 'pending',
    index: true
  },
  membershipFeesPaid: {
    type: Boolean,
    default: false,
    index: true
  },
  membershipYearsPaid: {
    type: [Number],
    default: [],
    index: true
  },
  creditBalance: {
    type: Number,
    default: 0,
    min: [0, 'Credit balance cannot be negative'],
    index: true
  },
  seedPoints: {
    type: Number,
    default: 0,
    min: [0, 'Seed points cannot be negative'],
    index: true
  },
  matchesWon: {
    type: Number,
    default: 0,
    min: [0, 'Matches won cannot be negative']
  },
  matchesPlayed: {
    type: Number,
    default: 0,
    min: [0, 'Matches played cannot be negative']
  },
  medals: {
    type: [{
      type: {
        type: String,
        enum: ['gold', 'silver', 'bronze'],
        required: true
      },
      tournamentName: {
        type: String,
        trim: true,
        maxlength: [200, 'Tournament name cannot exceed 200 characters']
      },
      awardedAt: {
        type: Date,
        default: Date.now
      }
    }],
    default: []
  },
  joinedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  approvedAt: {
    type: Date,
    default: null
  },
  approvedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete (ret as any).__v;
      return ret;
    }
  },
  toObject: {
    transform: function(doc, ret) {
      delete (ret as any).__v;
      return ret;
    }
  }
});

// Compound unique index: user can only join a club once
clubMembershipSchema.index({ userId: 1, clubId: 1 }, { unique: true });

// Compound indexes for better query performance
clubMembershipSchema.index({ clubId: 1, status: 1 });
clubMembershipSchema.index({ clubId: 1, role: 1 });
clubMembershipSchema.index({ clubId: 1, seedPoints: -1, matchesWon: -1 }); // For rankings
clubMembershipSchema.index({ userId: 1, status: 1 });

// Pre-save validation
clubMembershipSchema.pre('save', function(next) {
  const membership = this as IClubMembershipDocument;

  // If status is approved, set approvedAt if not already set
  if (membership.status === 'approved' && !membership.approvedAt) {
    membership.approvedAt = new Date();
  }

  next();
});

// Static method to find active members of a club
clubMembershipSchema.statics.findClubMembers = function(clubId: mongoose.Types.ObjectId, status = 'approved') {
  return this.find({
    clubId,
    status
  })
  .populate('userId', 'username fullName email profilePicture')
  .sort({ joinedAt: -1 });
};

// Static method to find user's clubs
clubMembershipSchema.statics.findUserClubs = function(userId: mongoose.Types.ObjectId) {
  return this.find({
    userId,
    status: { $in: ['pending', 'approved'] }
  })
  .populate('clubId', 'name slug logo primaryColor accentColor status')
  .sort({ joinedAt: -1 });
};

// Static method to check if user is member of club
clubMembershipSchema.statics.isMember = async function(userId: mongoose.Types.ObjectId, clubId: mongoose.Types.ObjectId) {
  const membership = await this.findOne({
    userId,
    clubId,
    status: 'approved'
  });

  return !!membership;
};

// Static method to get user's role in a club
clubMembershipSchema.statics.getUserRole = async function(userId: mongoose.Types.ObjectId, clubId: mongoose.Types.ObjectId) {
  const membership = await this.findOne({
    userId,
    clubId,
    status: 'approved'
  });

  return membership ? membership.role : null;
};

// Static method to get club rankings (top members by seed points)
clubMembershipSchema.statics.getClubRankings = function(clubId: mongoose.Types.ObjectId, limit = 10) {
  return this.find({
    clubId,
    status: 'approved'
  })
  .populate('userId', 'username fullName profilePicture')
  .sort({ seedPoints: -1, matchesWon: -1 })
  .limit(limit);
};

const ClubMembership = mongoose.model<IClubMembershipDocument>('ClubMembership', clubMembershipSchema);

export default ClubMembership;
