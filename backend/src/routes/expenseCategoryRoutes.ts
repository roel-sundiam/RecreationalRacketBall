import { Router } from 'express';
import {
  getAllCategories,
  getAllCategoriesIncludingInactive,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  activateCategory,
  reorderCategories,
  getCategoryUsage,
  createCategoryValidation,
  updateCategoryValidation
} from '../controllers/expenseCategoryController';
import { authenticateToken, requireFinancialAccess } from '../middleware/auth';
import { extractClubContext } from '../middleware/club';

const router = Router();

/**
 * @route GET /api/expense-categories
 * @desc Get all active expense categories sorted by display order
 * @access Private (Admin/SuperAdmin with financial access)
 */
router.get(
  '/',
  authenticateToken,
  extractClubContext,
  requireFinancialAccess,
  getAllCategories
);

/**
 * @route GET /api/expense-categories/all
 * @desc Get all categories including inactive (for admin management)
 * @access Private (Admin/SuperAdmin with financial access)
 */
router.get(
  '/all',
  authenticateToken,
  extractClubContext,
  requireFinancialAccess,
  getAllCategoriesIncludingInactive
);

/**
 * @route PUT /api/expense-categories/reorder
 * @desc Reorder categories (bulk update display order)
 * @access Private (Admin/SuperAdmin with financial access)
 */
router.put(
  '/reorder',
  authenticateToken,
  extractClubContext,
  requireFinancialAccess,
  reorderCategories
);

/**
 * @route GET /api/expense-categories/:id
 * @desc Get single category by ID
 * @access Private (Admin/SuperAdmin with financial access)
 */
router.get(
  '/:id',
  authenticateToken,
  extractClubContext,
  requireFinancialAccess,
  getCategoryById
);

/**
 * @route POST /api/expense-categories
 * @desc Create new expense category
 * @access Private (Admin/SuperAdmin with financial access)
 */
router.post(
  '/',
  authenticateToken,
  extractClubContext,
  requireFinancialAccess,
  createCategoryValidation,
  createCategory
);

/**
 * @route PUT /api/expense-categories/:id
 * @desc Update expense category
 * @access Private (Admin/SuperAdmin with financial access)
 */
router.put(
  '/:id',
  authenticateToken,
  extractClubContext,
  requireFinancialAccess,
  updateCategoryValidation,
  updateCategory
);

/**
 * @route DELETE /api/expense-categories/:id
 * @desc Soft-delete (deactivate) expense category
 * @access Private (Admin/SuperAdmin with financial access)
 */
router.delete(
  '/:id',
  authenticateToken,
  extractClubContext,
  requireFinancialAccess,
  deleteCategory
);

/**
 * @route PATCH /api/expense-categories/:id/activate
 * @desc Activate expense category
 * @access Private (Admin/SuperAdmin with financial access)
 */
router.patch(
  '/:id/activate',
  authenticateToken,
  extractClubContext,
  requireFinancialAccess,
  activateCategory
);

/**
 * @route GET /api/expense-categories/:id/usage
 * @desc Get category usage count
 * @access Private (Admin/SuperAdmin with financial access)
 */
router.get(
  '/:id/usage',
  authenticateToken,
  extractClubContext,
  requireFinancialAccess,
  getCategoryUsage
);

export default router;
