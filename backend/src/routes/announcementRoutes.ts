import express from 'express';
import {
  getActiveAnnouncements,
  createAnnouncement,
  dismissAnnouncement,
  getAnnouncements,
  deleteAnnouncement,
  stopAnnouncement,
  activateAnnouncement,
  updateAnnouncement
} from '../controllers/announcementController';
import { authenticateToken, requireAdmin, requireSuperAdmin } from '../middleware/auth';
import { extractClubContext, requireClubRole } from '../middleware/club';

const router = express.Router();

// Apply auth and club context to all routes
router.use(authenticateToken);
router.use(extractClubContext);

// Get active announcements (not dismissed by current user) - All club members
router.get('/active', getActiveAnnouncements);

// Dismiss announcement - All club members
router.post('/:id/dismiss', dismissAnnouncement);

// Get all announcements (admin view with pagination) - Club admin only
router.get('/', requireClubRole(['admin']), getAnnouncements);

// Create announcement - Club admin only
router.post('/', requireClubRole(['admin']), createAnnouncement);

// Update announcement - Club admin only
router.put('/:id', requireClubRole(['admin']), updateAnnouncement);

// Stop announcement (deactivate) - Club admin only
router.patch('/:id/stop', requireClubRole(['admin']), stopAnnouncement);

// Activate announcement (reactivate) - Club admin only
router.patch('/:id/activate', requireClubRole(['admin']), activateAnnouncement);

// Delete announcement - Club admin only
router.delete('/:id', requireClubRole(['admin']), deleteAnnouncement);

export default router;
