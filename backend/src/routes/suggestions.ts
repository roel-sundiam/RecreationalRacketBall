import express, { Response } from "express";
import { body, query, validationResult } from "express-validator";
import Suggestion from "../models/Suggestion";
import { AuthenticatedRequest, authenticateToken } from "../middleware/auth";
import {
  extractClubContext,
  requireClubRole,
  requireClubAdminOrTreasurer,
} from "../middleware/club";
import { asyncHandler } from "../middleware/errorHandler";
import {
  CreateSuggestionRequest,
  AdminResponseRequest,
  InternalNoteRequest,
} from "../types";

const router = express.Router();

// Apply auth and club context to all routes
router.use(authenticateToken);
router.use(extractClubContext);

// Validation rules
const createSuggestionValidation = [
  body("type")
    .isIn(["suggestion", "complaint"])
    .withMessage("Type must be either suggestion or complaint"),
  body("category")
    .isIn([
      "facility",
      "service",
      "booking",
      "payments",
      "general",
      "staff",
      "maintenance",
    ])
    .withMessage("Invalid category"),
  body("title")
    .isString()
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage("Title must be between 5 and 200 characters"),
  body("description")
    .isString()
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage("Description must be between 10 and 2000 characters"),
  body("priority")
    .optional()
    .isIn(["low", "medium", "high", "urgent"])
    .withMessage("Priority must be low, medium, high, or urgent"),
  body("isAnonymous")
    .optional()
    .isBoolean()
    .withMessage("isAnonymous must be a boolean"),
  body("tags")
    .optional()
    .isArray()
    .withMessage("Tags must be an array")
    .custom((tags) => {
      if (tags && tags.length > 10) {
        throw new Error("Cannot have more than 10 tags");
      }
      if (tags && tags.some((tag: string) => tag.length > 30)) {
        throw new Error("Each tag must be 30 characters or less");
      }
      return true;
    }),
];

const adminResponseValidation = [
  body("response")
    .isString()
    .trim()
    .isLength({ min: 5, max: 2000 })
    .withMessage("Response must be between 5 and 2000 characters"),
  body("actionTaken")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Action taken cannot exceed 500 characters"),
  body("status")
    .optional()
    .isIn(["in_review", "in_progress", "resolved", "closed"])
    .withMessage("Invalid status"),
];

const internalNoteValidation = [
  body("note")
    .isString()
    .trim()
    .isLength({ min: 5, max: 1000 })
    .withMessage("Note must be between 5 and 1000 characters"),
];

// Create a new suggestion or complaint
router.post(
  "/",
  createSuggestionValidation,
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

    const suggestionData: CreateSuggestionRequest = req.body;

    // Auto-escalate complaints to higher priority
    let priority = suggestionData.priority || "medium";
    if (suggestionData.type === "complaint") {
      if (priority === "low") priority = "medium";
      if (
        ["staff", "facility", "maintenance"].includes(
          suggestionData.category,
        ) &&
        priority === "medium"
      ) {
        priority = "high";
      }
    }

    try {
      const suggestion = await Suggestion.create({
        userId: req.user._id,
        type: suggestionData.type,
        category: suggestionData.category,
        priority,
        title: suggestionData.title,
        description: suggestionData.description,
        isAnonymous: suggestionData.isAnonymous || false,
        tags: suggestionData.tags || [],
        status: "open",
        clubId: req.clubId,
      });

      // Populate user data for response (unless anonymous)
      const populatedSuggestion = await Suggestion.findById(suggestion._id)
        .populate("userId", "fullName username")
        .exec();

      console.log(
        `📝 ${suggestionData.type} created: ${suggestionData.title} by ${req.user.username}`,
      );

      res.status(201).json({
        success: true,
        message: `${suggestionData.type === "complaint" ? "Complaint" : "Suggestion"} submitted successfully`,
        data: populatedSuggestion,
      });
    } catch (error) {
      console.error("Error creating suggestion:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create suggestion",
      });
    }
  }),
);

// Get suggestions/complaints (members see their own, admins see all)
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
      const {
        page = 1,
        limit = 20,
        type,
        category,
        status,
        priority,
        search,
      } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      // Build query based on user role
      let query: any = {};

      // Check if superadmin requesting all clubs
      const isSuperAdmin =
        (req as any).user?.role === "superadmin" ||
        (req as any).user?.role === "platform_admin";
      const allClubsQuery = req.query.allClubs;
      const allClubsRequested = Array.isArray(allClubsQuery)
        ? allClubsQuery.includes("true") || allClubsQuery.includes("1")
        : allClubsQuery === "true" || allClubsQuery === "1";

      // Only filter by clubId if not requesting all clubs
      if (!allClubsRequested || !isSuperAdmin) {
        if (req.clubId) {
          query.clubId = req.clubId;
        }
      }

      // Members can only see their own suggestions
      if (req.clubRole === "member") {
        query.userId = req.user._id;
      }

      // Apply filters
      if (type && (type === "suggestion" || type === "complaint")) {
        query.type = type;
      }

      if (category) {
        query.category = category;
      }

      if (status) {
        query.status = status;
      }

      if (priority) {
        query.priority = priority;
      }

      if (search) {
        query.$or = [
          { title: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
        ];
      }

      // Get suggestions with pagination
      const suggestions = await Suggestion.find(query)
        .populate("userId", "fullName username")
        .populate("adminResponse.responderId", "fullName username")
        .populate("internalNotes.adminId", "fullName username")
        .sort({ priority: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .exec();

      const totalCount = await Suggestion.countDocuments(query);

      // Filter out user data for anonymous suggestions (except for admins)
      const filteredSuggestions = suggestions.map((suggestion) => {
        const suggestionObj = suggestion.toObject();
        if (suggestion.isAnonymous && req.user!.role === "member") {
          suggestionObj.userId = undefined as any;
          suggestionObj.user = undefined as any;
        }
        return suggestionObj;
      });

      res.json({
        success: true,
        data: filteredSuggestions,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalCount / limitNum),
          totalCount,
          limit: limitNum,
        },
      });
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch suggestions",
      });
    }
  }),
);

// Get unread count (admin and treasurer access)
router.get(
  "/unread-count",
  requireClubAdminOrTreasurer,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Count suggestions/complaints that haven't been reviewed or responded to
      const unreadCount = await Suggestion.countDocuments({
        clubId: req.clubId,
        status: { $in: ["open", "in_review"] },
        "adminResponse.response": { $exists: false },
      });

      res.json({
        success: true,
        data: { count: unreadCount },
      });
    } catch (error) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch unread count",
      });
    }
  }),
);

// Get statistics (admin only)
router.get(
  "/stats",
  requireClubAdminOrTreasurer,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Check if superadmin requesting all clubs
      const isSuperAdmin =
        (req as any).user?.role === "superadmin" ||
        (req as any).user?.role === "platform_admin";
      const allClubsQuery = req.query.allClubs;
      const allClubsRequested = Array.isArray(allClubsQuery)
        ? allClubsQuery.includes("true") || allClubsQuery.includes("1")
        : allClubsQuery === "true" || allClubsQuery === "1";

      // Build match condition
      let matchCondition: any = {};
      if (!allClubsRequested || !isSuperAdmin) {
        if (req.clubId) {
          matchCondition.clubId = req.clubId;
        }
      }

      const [generalStats, categoryStats] = await Promise.all([
        Suggestion.aggregate([
          { $match: matchCondition },
          {
            $group: {
              _id: null,
              totalSuggestions: { $sum: 1 },
              openCount: {
                $sum: { $cond: [{ $eq: ["$status", "open"] }, 1, 0] },
              },
              inReviewCount: {
                $sum: { $cond: [{ $eq: ["$status", "in_review"] }, 1, 0] },
              },
              inProgressCount: {
                $sum: { $cond: [{ $eq: ["$status", "in_progress"] }, 1, 0] },
              },
              resolvedCount: {
                $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] },
              },
              closedCount: {
                $sum: { $cond: [{ $eq: ["$status", "closed"] }, 1, 0] },
              },
              suggestionCount: {
                $sum: { $cond: [{ $eq: ["$type", "suggestion"] }, 1, 0] },
              },
              complaintCount: {
                $sum: { $cond: [{ $eq: ["$type", "complaint"] }, 1, 0] },
              },
              urgentCount: {
                $sum: { $cond: [{ $eq: ["$priority", "urgent"] }, 1, 0] },
              },
              highPriorityCount: {
                $sum: { $cond: [{ $eq: ["$priority", "high"] }, 1, 0] },
              },
            },
          },
        ]),
        Suggestion.aggregate([
          { $match: matchCondition },
          {
            $group: {
              _id: "$category",
              count: { $sum: 1 },
              openCount: {
                $sum: { $cond: [{ $eq: ["$status", "open"] }, 1, 0] },
              },
              resolvedCount: {
                $sum: {
                  $cond: [{ $in: ["$status", ["resolved", "closed"]] }, 1, 0],
                },
              },
            },
          },
          {
            $sort: { count: -1 },
          },
        ]),
      ]);

      res.json({
        success: true,
        data: {
          general: generalStats[0] || {},
          categories: categoryStats,
        },
      });
    } catch (error) {
      console.error("Error fetching suggestion stats:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch statistics",
      });
    }
  }),
);

// Get a single suggestion by ID
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
      const suggestion = await Suggestion.findById(req.params.id)
        .populate("userId", "fullName username")
        .populate("adminResponse.responderId", "fullName username")
        .populate("internalNotes.adminId", "fullName username")
        .exec();

      if (!suggestion) {
        return res.status(404).json({
          success: false,
          error: "Suggestion not found",
        });
      }

      // Verify clubId
      if (suggestion.clubId?.toString() !== req.clubId?.toString()) {
        return res.status(404).json({
          success: false,
          error: "Suggestion not found",
        });
      }

      // Check permissions
      const isOwner = suggestion.userId.toString() === req.user._id.toString();
      const isAdmin = ["admin", "treasurer"].includes(req.clubRole || "");

      if (!isOwner && !isAdmin) {
        return res.status(403).json({
          success: false,
          error: "Access denied",
        });
      }

      // Filter out user data for anonymous suggestions (for non-admins)
      let suggestionData = suggestion.toObject();
      if (suggestion.isAnonymous && !isAdmin) {
        suggestionData.userId = undefined as any;
        suggestionData.user = undefined as any;
      }

      res.json({
        success: true,
        data: suggestionData,
      });
    } catch (error) {
      console.error("Error fetching suggestion:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch suggestion",
      });
    }
  }),
);

// Update suggestion status (admin only)
router.patch(
  "/:id/status",
  requireClubAdminOrTreasurer,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { status } = req.body;

    if (!["in_review", "in_progress", "resolved", "closed"].includes(status)) {
      return res.status(400).json({
        success: false,
        error: "Invalid status",
      });
    }

    try {
      const suggestion = await Suggestion.findById(req.params.id);

      if (!suggestion) {
        return res.status(404).json({
          success: false,
          error: "Suggestion not found",
        });
      }

      // Verify clubId
      if (suggestion.clubId?.toString() !== req.clubId?.toString()) {
        return res.status(404).json({
          success: false,
          error: "Suggestion not found",
        });
      }

      suggestion.status = status;
      suggestion.updatedAt = new Date();
      await suggestion.save();

      await suggestion.populate("userId", "fullName username");

      console.log(
        `📝 Suggestion status updated to ${status} by ${req.user?.username}`,
      );

      res.json({
        success: true,
        message: "Status updated successfully",
        data: suggestion,
      });
    } catch (error) {
      console.error("Error updating suggestion status:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update status",
      });
    }
  }),
);

// Add admin response (admin only)
router.post(
  "/:id/response",
  adminResponseValidation,
  requireClubAdminOrTreasurer,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: errors.array(),
      });
    }

    const responseData: AdminResponseRequest = req.body;

    try {
      const suggestion = await Suggestion.findById(req.params.id);

      if (!suggestion) {
        return res.status(404).json({
          success: false,
          error: "Suggestion not found",
        });
      }

      // Verify clubId
      if (suggestion.clubId?.toString() !== req.clubId?.toString()) {
        return res.status(404).json({
          success: false,
          error: "Suggestion not found",
        });
      }

      suggestion.adminResponse = {
        responderId: req.user?._id.toString() ?? "",
        response: responseData.response,
        responseDate: new Date(),
        actionTaken: responseData.actionTaken,
      };
      suggestion.updatedAt = new Date();

      if (responseData.status) {
        suggestion.status = responseData.status;
      }

      await suggestion.save();

      await suggestion.populate("userId", "fullName username");
      await suggestion.populate(
        "adminResponse.responderId",
        "fullName username",
      );

      console.log(
        `📝 Admin response added to suggestion ${req.params.id} by ${req.user?.username}`,
      );

      res.json({
        success: true,
        message: "Response added successfully",
        data: suggestion,
      });
    } catch (error) {
      console.error("Error adding admin response:", error);
      res.status(500).json({
        success: false,
        error: "Failed to add response",
      });
    }
  }),
);

// Add internal note (admin only)
router.post(
  "/:id/notes",
  internalNoteValidation,
  requireClubAdminOrTreasurer,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: errors.array(),
      });
    }

    const noteData: InternalNoteRequest = req.body;

    try {
      const suggestion = await Suggestion.findById(req.params.id);

      if (!suggestion) {
        return res.status(404).json({
          success: false,
          error: "Suggestion not found",
        });
      }

      // Verify clubId
      if (suggestion.clubId?.toString() !== req.clubId?.toString()) {
        return res.status(404).json({
          success: false,
          error: "Suggestion not found",
        });
      }

      if (!suggestion.internalNotes) {
        suggestion.internalNotes = [];
      }
      suggestion.internalNotes.push({
        adminId: req.user?._id.toString() ?? "",
        note: noteData.note,
        timestamp: new Date(),
      } as any);
      suggestion.updatedAt = new Date();

      await suggestion.save();

      await suggestion.populate("userId", "fullName username");
      await suggestion.populate("internalNotes.adminId", "fullName username");

      console.log(
        `📝 Internal note added to suggestion ${req.params.id} by ${req.user?.username}`,
      );

      res.json({
        success: true,
        message: "Note added successfully",
        data: suggestion,
      });
    } catch (error) {
      console.error("Error adding internal note:", error);
      res.status(500).json({
        success: false,
        error: "Failed to add note",
      });
    }
  }),
);

// Delete suggestion (owner or admin only)
router.delete(
  "/:id",
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
      });
    }

    try {
      const suggestion = await Suggestion.findById(req.params.id);

      if (!suggestion) {
        return res.status(404).json({
          success: false,
          error: "Suggestion not found",
        });
      }

      // Verify clubId
      if (suggestion.clubId?.toString() !== req.clubId?.toString()) {
        return res.status(404).json({
          success: false,
          error: "Suggestion not found",
        });
      }

      // Check permissions - owner can delete if status is 'open', admins can always delete
      const isOwner = suggestion.userId.toString() === req.user._id.toString();
      const isAdmin = ["admin", "treasurer"].includes(req.clubRole || "");

      if (!isAdmin && (!isOwner || suggestion.status !== "open")) {
        return res.status(403).json({
          success: false,
          error: "Can only delete your own open suggestions",
        });
      }

      await Suggestion.findByIdAndDelete(req.params.id);

      console.log(
        `📝 Suggestion deleted: ${req.params.id} by ${req.user.username}`,
      );

      res.json({
        success: true,
        message: "Suggestion deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting suggestion:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete suggestion",
      });
    }
  }),
);

export default router;
