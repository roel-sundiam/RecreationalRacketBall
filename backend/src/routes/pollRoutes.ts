import { Router } from 'express';
import {
  getPolls,
  getActivePolls,
  getPoll,
  createPoll,
  updatePoll,
  activatePoll,
  closePoll,
  vote,
  getPollStats,
  createOpenPlay,
  generateMatches,
  updateMatchOrder,
  getOpenPlayEvents,
  createPollValidation,
  voteValidation,
  createOpenPlayValidation,
  addAdminVote,
  removeAdminVote,
  removePlayerFromFutureMatches
} from '../controllers/pollController';
import { authenticateToken, requireRole } from '../middleware/auth';
import { extractClubContext, requireClubRole } from '../middleware/club';
import { validationResult } from 'express-validator';

const router = Router();

const handleValidationErrors = (req: any, res: any, next: any): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
    return;
  }
  next();
};

/**
 * @route GET /api/polls/test
 * @desc Test route to verify polls routes are working
 * @access Public
 */
router.get('/test', (req, res) => {
  console.log('🧪 Poll test route called');
  res.json({
    success: true,
    message: 'Poll routes are working!',
    timestamp: new Date().toISOString(),
    note: 'This route should be PUBLIC - no authentication required'
  });
});

/**
 * @route GET /api/polls/health
 * @desc Health check for poll routes
 * @access Public
 */
router.get('/health', (req, res) => {
  console.log('🧪 Poll health route called');
  res.json({
    success: true,
    message: 'Poll routes health check OK',
    timestamp: new Date().toISOString()
  });
});

/**
 * @route GET /api/polls/active
 * @desc Get active polls for current user
 * @access Private (requires club context)
 */
router.get('/active', authenticateToken, extractClubContext, getActivePolls);

/**
 * @route GET /api/polls/stats
 * @desc Get poll statistics (club admin only)
 * @access Private (Club Admin)
 */
router.get(
  '/stats',
  authenticateToken,
  extractClubContext,
  requireClubRole(['admin']),
  getPollStats
);

/**
 * @route GET /api/polls/open-play
 * @desc Get all Open Play events
 * @access Private (requires club context)
 */
router.get('/open-play', authenticateToken, extractClubContext, getOpenPlayEvents);

/**
 * @route POST /api/polls/open-play
 * @desc Create new Open Play event (club admin only)
 * @access Private (Club Admin)
 */
router.post(
  '/open-play',
  authenticateToken,
  extractClubContext,
  requireClubRole(['admin']),
  createOpenPlayValidation,
  handleValidationErrors,
  createOpenPlay
);

/**
 * @route GET /api/polls
 * @desc Get all polls with filtering and pagination
 * @access Private (requires club context)
 */
router.get('/', authenticateToken, extractClubContext, getPolls);

/**
 * @route POST /api/polls
 * @desc Create new poll (club admin only)
 * @access Private (Club Admin)
 */
router.post(
  '/',
  authenticateToken,
  extractClubContext,
  requireClubRole(['admin']),
  createPollValidation,
  handleValidationErrors,
  createPoll
);

/**
 * @route GET /api/polls/:id
 * @desc Get single poll with results
 * @access Private (requires club context)
 */
router.get('/:id', authenticateToken, extractClubContext, getPoll);

/**
 * @route PUT /api/polls/:id
 * @desc Update poll (club admin only)
 * @access Private (Club Admin)
 */
router.put(
  '/:id',
  authenticateToken,
  extractClubContext,
  requireClubRole(['admin']),
  updatePoll
);

/**
 * @route POST /api/polls/:id/activate
 * @desc Activate poll (club admin only)
 * @access Private (Club Admin)
 */
router.post(
  '/:id/activate',
  authenticateToken,
  extractClubContext,
  requireClubRole(['admin']),
  activatePoll
);

/**
 * @route POST /api/polls/:id/close
 * @desc Close poll (club admin only)
 * @access Private (Club Admin)
 */
router.post(
  '/:id/close',
  authenticateToken,
  extractClubContext,
  requireClubRole(['admin']),
  closePoll
);

/**
 * @route POST /api/polls/:id/vote
 * @desc Vote on poll
 * @access Private (requires club context)
 */
router.post(
  '/:id/vote',
  authenticateToken,
  extractClubContext,
  voteValidation,
  handleValidationErrors,
  vote
);

/**
 * @route POST /api/polls/:id/generate-matches
 * @desc Generate random doubles matches for Open Play event (club admin only)
 * @access Private (Club Admin)
 */
router.post(
  '/:id/generate-matches',
  authenticateToken,
  extractClubContext,
  requireClubRole(['admin']),
  generateMatches
);

/**
 * @route PUT /api/polls/:id/matches-order
 * @desc Update match order for Open Play event (club admin only)
 * @access Private (Club Admin)
 */
router.put(
  '/:id/matches-order',
  authenticateToken,
  extractClubContext,
  requireClubRole(['admin']),
  updateMatchOrder
);

/**
 * @route POST /api/polls/:id/admin-vote
 * @desc Add vote as admin (club admin only)
 * @access Private (Club Admin)
 */
router.post(
  '/:id/admin-vote',
  authenticateToken,
  extractClubContext,
  requireClubRole(['admin']),
  addAdminVote
);

/**
 * @route DELETE /api/polls/:id/admin-vote
 * @desc Remove vote as admin (club admin only)
 * @access Private (Club Admin)
 */
router.delete(
  '/:id/admin-vote',
  authenticateToken,
  extractClubContext,
  requireClubRole(['admin']),
  removeAdminVote
);

/**
 * @route POST /api/polls/:id/remove-player
 * @desc Remove player from future matches and regenerate incomplete matches (club admin only)
 * @access Private (Club Admin)
 */
router.post(
  '/:id/remove-player',
  authenticateToken,
  extractClubContext,
  requireClubRole(['admin']),
  removePlayerFromFutureMatches
);

export default router;