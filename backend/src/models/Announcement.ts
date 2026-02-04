import mongoose, { Document, Schema } from 'mongoose';

export interface IAnnouncement extends Document {
  title: string;
  content: string;
  createdBy: mongoose.Types.ObjectId;
  clubId: mongoose.Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const announcementSchema = new Schema<IAnnouncement>(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters'],
      maxlength: [100, 'Title cannot exceed 100 characters']
    },
    content: {
      type: String,
      required: [true, 'Content is required'],
      trim: true,
      minlength: [10, 'Content must be at least 10 characters'],
      maxlength: [1000, 'Content cannot exceed 1000 characters']
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator is required']
    },
    clubId: {
      type: Schema.Types.ObjectId,
      ref: 'Club',
      required: [true, 'Club ID is required']
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Index for efficient querying of active announcements by club
announcementSchema.index({ clubId: 1, isActive: 1, createdAt: -1 });

// Static method to get active announcements
announcementSchema.statics.getActiveAnnouncements = function() {
  return this.find({ isActive: true })
    .sort({ createdAt: -1 })
    .populate('createdBy', 'username firstName lastName');
};

const Announcement = mongoose.model<IAnnouncement>('Announcement', announcementSchema);

export default Announcement;
