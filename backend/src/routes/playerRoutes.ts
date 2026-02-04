import express from 'express';
import {
  getPlayers,
  getPlayer,
  createPlayer,
  updatePlayer,
  deletePlayer,
  getPlayerStats,
  updatePlayerMedal,
  deletePlayerMedal,
  editPlayerMedal
} from '../controllers/playerController';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { extractClubContext, requireClubRole } from '../middleware/club';

const router = express.Router();

// Apply auth and club context to all routes
router.use(authenticateToken);
router.use(extractClubContext);

// Member routes
router.get('/', getPlayers);
router.get('/:id/stats', getPlayerStats);
router.get('/:id', getPlayer);

// Admin routes (require admin privileges)
router.post('/', authenticateToken, requireAdmin, createPlayer);
router.put('/:id/medal', authenticateToken, requireAdmin, updatePlayerMedal);
router.patch('/:id/medal', authenticateToken, requireAdmin, editPlayerMedal);
router.delete('/:id/medal', authenticateToken, requireAdmin, deletePlayerMedal);
router.put('/:id', authenticateToken, requireAdmin, updatePlayer);
router.delete('/:id', authenticateToken, requireAdmin, deletePlayer);

export default router;
