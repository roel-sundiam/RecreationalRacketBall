import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { extractClubContext, requireClubRole } from '../middleware/club';
import {
  getTournaments,
  getTournament,
  createTournament,
  updateTournament,
  deleteTournament,
  processTournamentPoints,
  getTournamentStats,
  createTournamentValidation,
  updateTournamentValidation
} from '../controllers/tournamentController';

const router = Router();

// Apply auth and club context to all routes
router.use(authenticateToken);
router.use(extractClubContext);

// Read endpoints - all club members can view tournaments
router.get('/', getTournaments);
router.get('/stats', getTournamentStats);
router.get('/:id', getTournament);

// Admin-only write endpoints
router.post('/', requireClubRole(['admin']), createTournamentValidation, createTournament);
router.put('/:id', requireClubRole(['admin']), updateTournamentValidation, updateTournament);
router.delete('/:id', requireClubRole(['admin']), deleteTournament);
router.post('/:id/process-points', requireClubRole(['admin']), processTournamentPoints);

export default router;
