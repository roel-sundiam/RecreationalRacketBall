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

const router = express.Router();

// Get active announcements (not dismissed by current user) - All authenticated users
router.get('/active', authenticateToken, getActiveAnnouncements);

// Dismiss announcement - All authenticated users
router.post('/:id/dismiss', authenticateToken, dismissAnnouncement);

// Get all announcements (admin view with pagination) - Admin/Superadmin only
router.get('/', authenticateToken, requireAdmin, getAnnouncements);

// Create announcement - Superadmin only
router.post('/', authenticateToken, requireSuperAdmin, createAnnouncement);

// Update announcement - Superadmin only
router.put('/:id', authenticateToken, requireSuperAdmin, updateAnnouncement);

// Stop announcement (deactivate) - Superadmin only
router.patch('/:id/stop', authenticateToken, requireSuperAdmin, stopAnnouncement);

// Activate announcement (reactivate) - Superadmin only
router.patch('/:id/activate', authenticateToken, requireSuperAdmin, activateAnnouncement);

// Delete announcement - Superadmin only
router.delete('/:id', authenticateToken, requireSuperAdmin, deleteAnnouncement);

export default router;
