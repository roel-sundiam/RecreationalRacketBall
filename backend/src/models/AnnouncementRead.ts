import mongoose, { Document, Schema } from 'mongoose';

export interface IAnnouncementRead extends Document {
  announcementId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  dismissed: boolean;
  dismissedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const announcementReadSchema = new Schema<IAnnouncementRead>(
  {
    announcementId: {
      type: Schema.Types.ObjectId,
      ref: 'Announcement',
      required: [true, 'Announcement ID is required']
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required']
    },
    dismissed: {
      type: Boolean,
      default: true
    },
    dismissedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Compound unique index to prevent duplicate tracking records
announcementReadSchema.index({ announcementId: 1, userId: 1 }, { unique: true });

const AnnouncementRead = mongoose.model<IAnnouncementRead>('AnnouncementRead', announcementReadSchema);

export default AnnouncementRead;
