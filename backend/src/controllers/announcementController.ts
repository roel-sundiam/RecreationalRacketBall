import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import Announcement, { IAnnouncement } from '../models/Announcement';
import AnnouncementRead from '../models/AnnouncementRead';
import { webSocketService } from '../services/websocketService';

// Get active announcements (recurring - shows every time)
export const getActiveAnnouncements = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?._id.toString();

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Get all active announcements (no dismissal filtering - recurring announcements)
    const activeAnnouncements = await Announcement.find({ isActive: true })
      .sort({ createdAt: -1 })
      .populate('createdBy', 'username firstName lastName');

    res.json({
      success: true,
      data: activeAnnouncements
    });
  } catch (error) {
    console.error('Error fetching active announcements:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch announcements'
    });
  }
};

// Create announcement (superadmin only)
export const createAnnouncement = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, content } = req.body;
    const createdBy = req.user?._id;

    if (!createdBy) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const announcement = new Announcement({
      title,
      content,
      createdBy,
      isActive: true
    });

    await announcement.save();
    await announcement.populate('createdBy', 'username firstName lastName');

    // Emit WebSocket event to all connected clients
    webSocketService.emitAnnouncement({
      _id: (announcement._id as any).toString(),
      title: announcement.title,
      content: announcement.content,
      createdBy: announcement.createdBy as any,
      createdAt: announcement.createdAt
    });

    res.status(201).json({
      success: true,
      message: 'Announcement created successfully',
      data: announcement
    });
  } catch (error: any) {
    console.error('Error creating announcement:', error);

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create announcement'
    });
  }
};

// Dismiss announcement (temporary close - will show again on next login)
export const dismissAnnouncement = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id.toString();

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Check if announcement exists
    const announcement = await Announcement.findById(id);
    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }

    // Log dismissal for analytics (optional - doesn't affect future displays)
    await AnnouncementRead.findOneAndUpdate(
      { announcementId: id, userId },
      {
        announcementId: id,
        userId,
        dismissed: true,
        dismissedAt: new Date()
      },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      message: 'Announcement closed (will show again on next login)'
    });
  } catch (error) {
    console.error('Error dismissing announcement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to dismiss announcement'
    });
  }
};

// Stop announcement (superadmin only - makes it inactive, can be reactivated later)
export const stopAnnouncement = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const announcement = await Announcement.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }

    res.json({
      success: true,
      message: 'Announcement stopped successfully',
      data: announcement
    });
  } catch (error) {
    console.error('Error stopping announcement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to stop announcement'
    });
  }
};

// Activate announcement (superadmin only - reactivates a stopped announcement)
export const activateAnnouncement = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const announcement = await Announcement.findByIdAndUpdate(
      id,
      { isActive: true },
      { new: true }
    ).populate('createdBy', 'username firstName lastName');

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }

    // Emit WebSocket event to all connected clients
    webSocketService.emitAnnouncement({
      _id: (announcement._id as any).toString(),
      title: announcement.title,
      content: announcement.content,
      createdBy: announcement.createdBy as any,
      createdAt: announcement.createdAt
    });

    res.json({
      success: true,
      message: 'Announcement activated successfully',
      data: announcement
    });
  } catch (error) {
    console.error('Error activating announcement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to activate announcement'
    });
  }
};

// Update announcement (superadmin only - edit title and content)
export const updateAnnouncement = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;

    const announcement = await Announcement.findByIdAndUpdate(
      id,
      { title, content },
      { new: true, runValidators: true }
    ).populate('createdBy', 'username firstName lastName');

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }

    // If announcement is active, broadcast the update to all connected clients
    if (announcement.isActive) {
      webSocketService.emitAnnouncement({
        _id: (announcement._id as any).toString(),
        title: announcement.title,
        content: announcement.content,
        createdBy: announcement.createdBy as any,
        createdAt: announcement.createdAt
      });
    }

    res.json({
      success: true,
      message: 'Announcement updated successfully',
      data: announcement
    });
  } catch (error: any) {
    console.error('Error updating announcement:', error);

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update announcement'
    });
  }
};

// Get all announcements (admin view, paginated)
export const getAnnouncements = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [announcements, total] = await Promise.all([
      Announcement.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('createdBy', 'username firstName lastName'),
      Announcement.countDocuments()
    ]);

    res.json({
      success: true,
      data: {
        announcements,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching announcements:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch announcements'
    });
  }
};

// Delete announcement (superadmin only)
export const deleteAnnouncement = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const announcement = await Announcement.findByIdAndDelete(id);

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }

    // Also delete all read records for this announcement
    await AnnouncementRead.deleteMany({ announcementId: id });

    res.json({
      success: true,
      message: 'Announcement deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting announcement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete announcement'
    });
  }
};
