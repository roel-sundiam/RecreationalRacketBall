import { Router } from 'express';
import {
  getAllExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
  getExpenseCategories,
  getExpenseStats,
  expenseValidationRules
} from '../controllers/expenseController';
import { authenticateToken, requireRole, requireFinancialAccess } from '../middleware/auth';
import { extractClubContext, requireClubRole } from '../middleware/club';

const router = Router();

// Apply auth and club context to all routes
router.use(authenticateToken);
router.use(extractClubContext);
router.use(requireClubRole(['admin', 'treasurer'])); // All expense routes require admin or treasurer

/**
 * @route GET /api/expenses
 * @desc Get all expenses with pagination and filtering
 * @access Private (Club Admin/Treasurer)
 */
router.get(
  '/',
  getAllExpenses
);

/**
 * @route GET /api/expenses/categories
 * @desc Get all expense categories
 * @access Private (Club Admin/Treasurer)
 */
router.get(
  '/categories',
  getExpenseCategories
);

/**
 * @route GET /api/expenses/stats
 * @desc Get expense statistics
 * @access Private (Club Admin/Treasurer)
 */
router.get(
  '/stats',
  getExpenseStats
);

/**
 * @route GET /api/expenses/:id
 * @desc Get single expense by ID
 * @access Private (Club Admin/Treasurer)
 */
router.get(
  '/:id',
  getExpenseById
);

/**
 * @route POST /api/expenses
 * @desc Create new expense
 * @access Private (Club Admin/Treasurer)
 */
router.post(
  '/',
  expenseValidationRules,
  createExpense
);

/**
 * @route PUT /api/expenses/:id
 * @desc Update existing expense
 * @access Private (Club Admin/Treasurer)
 */
router.put(
  '/:id',
  expenseValidationRules,
  updateExpense
);

/**
 * @route DELETE /api/expenses/:id
 * @desc Delete expense
 * @access Private (Club Admin/Treasurer)
 */
router.delete(
  '/:id',
  deleteExpense
);

export default router;