import express, { Response } from "express";
import { body, validationResult } from "express-validator";
import Rule from "../models/Rule";
import Club from "../models/Club";
import { AuthenticatedRequest, authenticateToken } from "../middleware/auth";
import { extractClubContext, requireClubRole } from "../middleware/club";
import { asyncHandler } from "../middleware/errorHandler";

const router = express.Router();

// Apply auth and club context to all routes
router.use(authenticateToken);
router.use(extractClubContext);

// Validation rules
const createRuleValidation = [
  body("title")
    .isString()
    .trim()
    .isLength({ min: 5, max: 100 })
    .withMessage("Title must be between 5 and 100 characters"),
  body("description")
    .isString()
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage("Description must be between 10 and 1000 characters"),
  body("category")
    .isIn([
      "general",
      "payment",
      "cancellation",
      "conduct",
      "court-usage",
      "guest",
      "other",
    ])
    .withMessage("Invalid category"),
  body("icon").isString().trim().notEmpty().withMessage("Icon is required"),
  body("order")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Order must be a non-negative integer"),
  body("details").optional().isArray().withMessage("Details must be an array"),
];

const updateRuleValidation = [
  body("title")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 5, max: 100 })
    .withMessage("Title must be between 5 and 100 characters"),
  body("description")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage("Description must be between 10 and 1000 characters"),
  body("category")
    .optional()
    .isIn([
      "general",
      "payment",
      "cancellation",
      "conduct",
      "court-usage",
      "guest",
      "other",
    ])
    .withMessage("Invalid category"),
  body("icon")
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Icon is required"),
  body("order")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Order must be a non-negative integer"),
  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean"),
  body("details").optional().isArray().withMessage("Details must be an array"),
];

// Get all rules for a club (public endpoint for members)
router.get(
  "/",
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
      });
    }

    try {
      const rules = await Rule.find({
        clubId: req.clubId,
        isActive: true,
      })
        .sort({ order: 1, createdAt: -1 })
        .exec();

      // Fetch club name
      const Club = require("../models/Club").default;
      const club = await Club.findById(req.clubId).select("name").exec();

      res.json({
        success: true,
        data: rules,
        clubName: club?.name || "Club",
      });
    } catch (error) {
      console.error("Error fetching rules:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch rules",
      });
    }
  }),
);

// Create a new rule (admin only)
router.post(
  "/",
  requireClubRole(["admin"]),
  createRuleValidation,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: errors.array(),
      });
    }

    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
      });
    }

    try {
      const rule = await Rule.create({
        clubId: req.clubId,
        title: req.body.title,
        description: req.body.description,
        category: req.body.category,
        icon: req.body.icon,
        order: req.body.order || 0,
        isActive: true,
        details: req.body.details || [],
        createdBy: req.user._id,
      });

      console.log(`📋 Rule created: ${req.body.title} for club ${req.clubId}`);

      res.status(201).json({
        success: true,
        message: "Rule created successfully",
        data: rule,
      });
    } catch (error) {
      console.error("Error creating rule:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create rule",
      });
    }
  }),
);

// Get a specific rule
router.get(
  "/:id",
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
      });
    }

    try {
      const rule = await Rule.findOne({
        _id: req.params.id,
        clubId: req.clubId,
      }).exec();

      if (!rule) {
        return res.status(404).json({
          success: false,
          error: "Rule not found",
        });
      }

      res.json({
        success: true,
        data: rule,
      });
    } catch (error) {
      console.error("Error fetching rule:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch rule",
      });
    }
  }),
);

// Update a rule (admin only)
router.patch(
  "/:id",
  requireClubRole(["admin"]),
  updateRuleValidation,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: errors.array(),
      });
    }

    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
      });
    }

    try {
      const rule = await Rule.findOneAndUpdate(
        {
          _id: req.params.id,
          clubId: req.clubId,
        },
        {
          ...req.body,
          updatedBy: req.user._id,
        },
        { new: true, runValidators: true },
      ).exec();

      if (!rule) {
        return res.status(404).json({
          success: false,
          error: "Rule not found",
        });
      }

      console.log(`📋 Rule updated: ${rule.title} for club ${req.clubId}`);

      res.json({
        success: true,
        message: "Rule updated successfully",
        data: rule,
      });
    } catch (error) {
      console.error("Error updating rule:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update rule",
      });
    }
  }),
);

// Delete a rule (admin only)
router.delete(
  "/:id",
  requireClubRole(["admin"]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
      });
    }

    try {
      const rule = await Rule.findOneAndDelete({
        _id: req.params.id,
        clubId: req.clubId,
      }).exec();

      if (!rule) {
        return res.status(404).json({
          success: false,
          error: "Rule not found",
        });
      }

      console.log(`🗑️ Rule deleted: ${rule.title} for club ${req.clubId}`);

      res.json({
        success: true,
        message: "Rule deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting rule:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete rule",
      });
    }
  }),
);

// Reorder rules (admin only)
router.patch(
  "/reorder/bulk",
  requireClubRole(["admin"]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
      });
    }

    try {
      const { rules } = req.body;
      if (!Array.isArray(rules)) {
        return res.status(400).json({
          success: false,
          error: "Rules must be an array",
        });
      }

      // Batch update rules with new order
      const updatePromises = rules.map((rule: any, index: number) =>
        Rule.updateOne(
          { _id: rule._id, clubId: req.clubId },
          { order: index, updatedBy: req.user!._id },
        ),
      );

      await Promise.all(updatePromises);

      console.log(`📋 Rules reordered for club ${req.clubId}`);

      res.json({
        success: true,
        message: "Rules reordered successfully",
      });
    } catch (error) {
      console.error("Error reordering rules:", error);
      res.status(500).json({
        success: false,
        error: "Failed to reorder rules",
      });
    }
  }),
);

export default router;
