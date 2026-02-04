import mongoose, { Schema, Document } from 'mongoose';

export interface IClub {
  _id: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  sport: 'Tennis' | 'Badminton' | 'Squash' | 'Racquetball' | 'Table Tennis' | 'Pickleball';
  contactEmail: string;
  contactPhone: string;
  address: {
    street: string;
    city: string;
    province: string;
    postalCode: string;
    country: string;
  };
  coordinates: {
    latitude: number;
    longitude: number;
  };
  logo?: string;
  primaryColor: string;
  accentColor: string;
  status: 'active' | 'suspended' | 'trial';
  subscriptionTier: 'free' | 'basic' | 'premium';
  ownerId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IClubDocument extends Omit<IClub, '_id'>, Document {
  _id: mongoose.Types.ObjectId;
}

const clubSchema = new Schema<IClubDocument>({
  name: {
    type: String,
    required: [true, 'Club name is required'],
    trim: true,
    minlength: [3, 'Club name must be at least 3 characters long'],
    maxlength: [100, 'Club name cannot exceed 100 characters']
  },
  slug: {
    type: String,
    required: [true, 'Club slug is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'],
    index: true
  },
  sport: {
    type: String,
    required: [true, 'Sport type is required'],
    enum: {
      values: ['Tennis', 'Badminton', 'Squash', 'Racquetball', 'Table Tennis', 'Pickleball'],
      message: 'Sport must be one of: Tennis, Badminton, Squash, Racquetball, Table Tennis, Pickleball'
    },
    index: true
  },
  contactEmail: {
    type: String,
    required: [true, 'Contact email is required'],
    trim: true,
    lowercase: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  contactPhone: {
    type: String,
    required: [true, 'Contact phone is required'],
    trim: true,
    match: [/^[\+]?[\d\s\-\(\)]+$/, 'Please enter a valid phone number']
  },
  address: {
    street: {
      type: String,
      required: [true, 'Street address is required'],
      trim: true
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true
    },
    province: {
      type: String,
      required: [true, 'Province/State is required'],
      trim: true
    },
    postalCode: {
      type: String,
      required: [true, 'Postal code is required'],
      trim: true
    },
    country: {
      type: String,
      required: [true, 'Country is required'],
      trim: true,
      default: 'Philippines'
    }
  },
  coordinates: {
    latitude: {
      type: Number,
      required: [true, 'Latitude is required'],
      min: [-90, 'Latitude must be between -90 and 90'],
      max: [90, 'Latitude must be between -90 and 90']
    },
    longitude: {
      type: Number,
      required: [true, 'Longitude is required'],
      min: [-180, 'Longitude must be between -180 and 180'],
      max: [180, 'Longitude must be between -180 and 180']
    }
  },
  logo: {
    type: String,
    default: null
  },
  primaryColor: {
    type: String,
    default: '#1976d2',
    match: [/^#[0-9A-Fa-f]{6}$/, 'Primary color must be a valid hex color code']
  },
  accentColor: {
    type: String,
    default: '#ff4081',
    match: [/^#[0-9A-Fa-f]{6}$/, 'Accent color must be a valid hex color code']
  },
  status: {
    type: String,
    enum: {
      values: ['active', 'suspended', 'trial'],
      message: 'Status must be active, suspended, or trial'
    },
    default: 'trial',
    index: true
  },
  subscriptionTier: {
    type: String,
    enum: {
      values: ['free', 'basic', 'premium'],
      message: 'Subscription tier must be free, basic, or premium'
    },
    default: 'free',
    index: true
  },
  ownerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Owner ID is required'],
    index: true
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

// Compound indexes for better query performance
clubSchema.index({ status: 1, createdAt: -1 });
clubSchema.index({ subscriptionTier: 1, status: 1 });
clubSchema.index({ ownerId: 1, status: 1 });

// Pre-save middleware to generate slug from name if not provided
clubSchema.pre('save', function(next) {
  const club = this as IClubDocument;

  // Auto-generate slug from name if not provided
  if (!club.slug && club.name) {
    club.slug = club.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  next();
});

// Static method to find active clubs
clubSchema.statics.findActiveClubs = function() {
  return this.find({
    status: 'active'
  }).sort({ createdAt: -1 });
};

// Static method to find clubs by owner
clubSchema.statics.findByOwner = function(ownerId: mongoose.Types.ObjectId) {
  return this.find({
    ownerId
  }).sort({ createdAt: -1 });
};

const Club = mongoose.model<IClubDocument>('Club', clubSchema);

export default Club;
