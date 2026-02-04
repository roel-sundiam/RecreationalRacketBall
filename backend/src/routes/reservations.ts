import express from 'express';
import {
  getReservations,
  getReservationsForDate,
  getReservation,
  createReservation,
  updateReservation,
  cancelReservation,
  updateReservationStatus,
  completeReservation,
  getMyUpcomingReservations,
  createReservationValidation,
  updateReservationValidation,
  completeReservationValidation,
  blockCourt,
  getBlockedReservations,
  updateBlockedReservation,
  deleteBlockedReservation,
  blockCourtValidation
} from '../controllers/reservationController';
import { requireAdmin, requireApprovedUser, requireMembershipFees, authenticateToken } from '../middleware/auth';
import { extractClubContext, requireClubRole } from '../middleware/club';
import { validateRequest } from '../middleware/validation';

const router = express.Router();

// NOTE: authenticateToken is already applied in server.ts line 214, so no need to apply it again here

// Get user's upcoming reservations (no club context needed - returns all clubs)
router.get('/my-upcoming', getMyUpcomingReservations);

// All other routes require club context and approved user
router.use(extractClubContext);
router.use(requireApprovedUser);

// Get all reservations (with filtering)
router.get('/', getReservations);

// Get reservations for specific date with availability
router.get('/date/:date', getReservationsForDate);

// Get single reservation
router.get('/:id', getReservation);

// Create new reservation (requires membership fees paid)
router.post('/', 
  requireMembershipFees,
  createReservationValidation,
  validateRequest,
  createReservation
);

// Update reservation (requires membership fees paid)
router.put('/:id',
  requireMembershipFees,
  updateReservationValidation,
  validateRequest,
  updateReservation
);

// Cancel reservation
router.delete('/:id', cancelReservation);

// Admin only: Update reservation status (club admin)
router.patch('/:id/status', requireClubRole(['admin']), updateReservationStatus);

// Admin only: Complete reservation with match results (club admin)
router.patch('/:id/complete',
  requireClubRole(['admin']),
  completeReservationValidation,
  validateRequest,
  completeReservation
);

// Admin only: Court blocking routes (club admin)
router.get('/admin/blocks', requireClubRole(['admin']), getBlockedReservations);
router.post('/admin/block',
  requireClubRole(['admin']),
  blockCourtValidation,
  validateRequest,
  blockCourt
);
router.put('/admin/block/:id', requireClubRole(['admin']), updateBlockedReservation);
router.delete('/admin/block/:id', requireClubRole(['admin']), deleteBlockedReservation);

export default router;