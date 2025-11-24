import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth';
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

// All tournament routes require admin authentication
router.use(authenticateToken, requireAdmin);

// Get all tournaments
router.get('/', getTournaments);

// Get tournament statistics
router.get('/stats', getTournamentStats);

// Get single tournament
router.get('/:id', getTournament);

// Create new tournament
router.post('/', createTournamentValidation, createTournament);

// Update tournament
router.put('/:id', updateTournamentValidation, updateTournament);

// Delete tournament
router.delete('/:id', deleteTournament);

// Process points for tournament
router.post('/:id/process-points', processTournamentPoints);

export default router;
