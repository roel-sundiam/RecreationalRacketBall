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

const router = Router();

/**
 * @route GET /api/expenses
 * @desc Get all expenses with pagination and filtering
 * @access Private (Admin/SuperAdmin)
 */
router.get(
  '/',
  authenticateToken,
  requireFinancialAccess,
  getAllExpenses
);

/**
 * @route GET /api/expenses/categories
 * @desc Get all expense categories
 * @access Private (Admin/SuperAdmin)
 */
router.get(
  '/categories',
  authenticateToken,
  requireFinancialAccess,
  getExpenseCategories
);

/**
 * @route GET /api/expenses/stats
 * @desc Get expense statistics
 * @access Private (Admin/SuperAdmin)
 */
router.get(
  '/stats',
  authenticateToken,
  requireFinancialAccess,
  getExpenseStats
);

/**
 * @route GET /api/expenses/:id
 * @desc Get single expense by ID
 * @access Private (Admin/SuperAdmin)
 */
router.get(
  '/:id',
  authenticateToken,
  requireFinancialAccess,
  getExpenseById
);

/**
 * @route POST /api/expenses
 * @desc Create new expense
 * @access Private (Admin/SuperAdmin)
 */
router.post(
  '/',
  authenticateToken,
  requireFinancialAccess,
  expenseValidationRules,
  createExpense
);

/**
 * @route PUT /api/expenses/:id
 * @desc Update existing expense
 * @access Private (Admin/SuperAdmin)
 */
router.put(
  '/:id',
  authenticateToken,
  requireFinancialAccess,
  expenseValidationRules,
  updateExpense
);

/**
 * @route DELETE /api/expenses/:id
 * @desc Delete expense
 * @access Private (Admin/SuperAdmin)
 */
router.delete(
  '/:id',
  authenticateToken,
  requireFinancialAccess,
  deleteExpense
);

export default router;