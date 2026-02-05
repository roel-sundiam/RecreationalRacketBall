import { Response } from 'express';
import { body, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import ExpenseCategory from '../models/ExpenseCategory';
import Expense from '../models/Expense';
import { AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

/**
 * Get all active expense categories sorted by display order
 * GET /api/expense-categories
 */
export const getAllCategories = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const categories = await ExpenseCategory.find({ isActive: true })
    .sort({ displayOrder: 1, name: 1 })
    .lean();

  return res.status(200).json({
    success: true,
    data: categories
  });
});

/**
 * Get all categories including inactive (for admin management)
 * GET /api/expense-categories/all
 */
export const getAllCategoriesIncludingInactive = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const categories = await ExpenseCategory.find()
    .sort({ displayOrder: 1, name: 1 })
    .populate('createdBy', 'firstName lastName username')
    .populate('updatedBy', 'firstName lastName username')
    .lean();

  return res.status(200).json({
    success: true,
    data: categories
  });
});

/**
 * Get single category by ID
 * GET /api/expense-categories/:id
 */
export const getCategoryById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const category = await ExpenseCategory.findById(id)
    .populate('createdBy', 'firstName lastName username')
    .populate('updatedBy', 'firstName lastName username')
    .lean();

  if (!category) {
    return res.status(404).json({
      success: false,
      message: 'Category not found'
    });
  }

  return res.status(200).json({
    success: true,
    data: category
  });
});

/**
 * Create new expense category
 * POST /api/expense-categories
 */
export const createCategory = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation errors',
      errors: errors.array()
    });
  }

  const { name, description, color, icon } = req.body;

  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'User not authenticated'
    });
  }

  const userId = req.user._id;

  // Check for duplicate name (case-insensitive)
  const existingCategory = await ExpenseCategory.findOne({
    name: { $regex: new RegExp(`^${name}$`, 'i') }
  });

  if (existingCategory) {
    return res.status(400).json({
      success: false,
      message: 'Category name already exists (case-insensitive)'
    });
  }

  // Get the highest display order and increment
  const maxOrderCategory = await ExpenseCategory.findOne()
    .sort({ displayOrder: -1 })
    .lean();

  const displayOrder = maxOrderCategory ? maxOrderCategory.displayOrder + 1 : 0;

  const category = new ExpenseCategory({
    name,
    description,
    color,
    icon,
    displayOrder,
    isActive: true,
    createdBy: userId
  });

  await category.save();

  return res.status(201).json({
    success: true,
    message: 'Category created successfully',
    data: category
  });
});

/**
 * Update expense category
 * PUT /api/expense-categories/:id
 */
export const updateCategory = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation errors',
      errors: errors.array()
    });
  }

  const { id } = req.params;
  const { name, description, color, icon, displayOrder } = req.body;

  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'User not authenticated'
    });
  }

  const userId = req.user._id;

  const category = await ExpenseCategory.findById(id);

  if (!category) {
    return res.status(404).json({
      success: false,
      message: 'Category not found'
    });
  }

  // Check for duplicate name (case-insensitive), excluding current category
  if (name && name !== category.name) {
    const existingCategory = await ExpenseCategory.findOne({
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      _id: { $ne: id }
    });

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: 'Category name already exists (case-insensitive)'
      });
    }

    // If name is being changed, update all expenses using the old name
    await Expense.updateMany(
      { category: category.name },
      { category: name }
    );
  }

  // Update fields
  if (name) category.name = name;
  if (description !== undefined) category.description = description;
  if (color !== undefined) category.color = color;
  if (icon !== undefined) category.icon = icon;
  if (displayOrder !== undefined) category.displayOrder = displayOrder;
  category.updatedBy = userId;

  await category.save();

  return res.status(200).json({
    success: true,
    message: 'Category updated successfully',
    data: category
  });
});

/**
 * Soft-delete (deactivate) expense category
 * DELETE /api/expense-categories/:id
 */
export const deleteCategory = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'User not authenticated'
    });
  }

  const userId = req.user._id;

  const category = await ExpenseCategory.findById(id);

  if (!category) {
    return res.status(404).json({
      success: false,
      message: 'Category not found'
    });
  }

  // Check if category is used in any expenses
  const expenseCount = await Expense.countDocuments({ category: category.name });

  if (expenseCount > 0) {
    return res.status(400).json({
      success: false,
      message: `Cannot delete category. It is used in ${expenseCount} expense(s)`,
      data: { usageCount: expenseCount }
    });
  }

  // Soft delete
  category.isActive = false;
  category.updatedBy = userId;
  await category.save();

  return res.status(200).json({
    success: true,
    message: 'Category deactivated successfully'
  });
});

/**
 * Activate expense category
 * PATCH /api/expense-categories/:id/activate
 */
export const activateCategory = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'User not authenticated'
    });
  }

  const userId = req.user._id;

  const category = await ExpenseCategory.findById(id);

  if (!category) {
    return res.status(404).json({
      success: false,
      message: 'Category not found'
    });
  }

  category.isActive = true;
  category.updatedBy = userId;
  await category.save();

  return res.status(200).json({
    success: true,
    message: 'Category activated successfully',
    data: category
  });
});

/**
 * Reorder categories (bulk update display order)
 * PUT /api/expense-categories/reorder
 */
export const reorderCategories = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { categoryIds } = req.body;

  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'User not authenticated'
    });
  }

  const userId = req.user._id;

  if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'categoryIds must be a non-empty array'
    });
  }

  // Update display order for each category
  const updatePromises = categoryIds.map((categoryId, index) =>
    ExpenseCategory.findByIdAndUpdate(
      categoryId,
      { displayOrder: index, updatedBy: userId },
      { new: true }
    )
  );

  await Promise.all(updatePromises);

  return res.status(200).json({
    success: true,
    message: 'Categories reordered successfully'
  });
});

/**
 * Get category usage count
 * GET /api/expense-categories/:id/usage
 */
export const getCategoryUsage = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const category = await ExpenseCategory.findById(id);

  if (!category) {
    return res.status(404).json({
      success: false,
      message: 'Category not found'
    });
  }

  const usageCount = await Expense.countDocuments({ category: category.name });

  return res.status(200).json({
    success: true,
    data: { usageCount }
  });
});

/**
 * Validation rules for creating category
 */
export const createCategoryValidation = [
  body('name')
    .notEmpty().withMessage('Category name is required')
    .isLength({ min: 3, max: 100 }).withMessage('Category name must be between 3 and 100 characters')
    .trim(),
  body('description')
    .optional({ checkFalsy: true })
    .isLength({ max: 500 }).withMessage('Description must not exceed 500 characters')
    .trim(),
  body('color')
    .optional({ checkFalsy: true })
    .matches(/^#[0-9A-F]{6}$/i).withMessage('Color must be a valid hex format (#RRGGBB)'),
  body('icon')
    .optional({ checkFalsy: true })
    .isLength({ max: 50 }).withMessage('Icon name must not exceed 50 characters')
    .trim()
];

/**
 * Validation rules for updating category
 */
export const updateCategoryValidation = [
  body('name')
    .optional({ checkFalsy: true })
    .isLength({ min: 3, max: 100 }).withMessage('Category name must be between 3 and 100 characters')
    .trim(),
  body('description')
    .optional({ checkFalsy: true })
    .isLength({ max: 500 }).withMessage('Description must not exceed 500 characters')
    .trim(),
  body('color')
    .optional({ checkFalsy: true })
    .matches(/^#[0-9A-F]{6}$/i).withMessage('Color must be a valid hex format (#RRGGBB)'),
  body('icon')
    .optional({ checkFalsy: true })
    .isLength({ max: 50 }).withMessage('Icon name must not exceed 50 characters')
    .trim(),
  body('displayOrder')
    .optional({ checkFalsy: true })
    .isInt({ min: 0 }).withMessage('Display order must be a non-negative integer')
];
