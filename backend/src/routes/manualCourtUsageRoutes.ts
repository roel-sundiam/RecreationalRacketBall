import { Router } from 'express';
import {
  createManualCourtUsage,
  getManualCourtUsageHistory,
  createManualCourtUsageValidation
} from '../controllers/manualCourtUsageController';
import { authenticateToken } from '../middleware/auth';
import { extractClubContext, requireClubAdminOrTreasurer } from '../middleware/club';

const router = Router();

/**
 * @route POST /api/manual-court-usage
 * @desc Create manual court usage record and generate pending payments
 * @access Private (Club Admin/Treasurer)
 */
router.post(
  '/',
  authenticateToken,
  extractClubContext,
  requireClubAdminOrTreasurer,
  createManualCourtUsageValidation,
  createManualCourtUsage
);

/**
 * @route GET /api/manual-court-usage
 * @desc Get manual court usage history
 * @access Private (Club Admin/Treasurer)
 */
router.get(
  '/',
  authenticateToken,
  extractClubContext,
  requireClubAdminOrTreasurer,
  getManualCourtUsageHistory
);

export default router;
