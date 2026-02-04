import { Router, Request, Response, NextFunction } from "express";
import {
  getMembers,
  getMemberProfile,
  getMemberActivity,
  getMemberStats,
  searchMembers,
  getMembersValidation,
  updateMemberApproval,
  updateMemberRole,
  deleteMember,
  reactivateMember,
  getPendingMembers,
  getInactiveMembers,
  resetMemberPassword,
  requestClubMembership,
  getMyMembershipRequests,
  cancelMembershipRequest,
} from "../controllers/memberController";
import {
  authenticateToken,
  preventImpersonationFor,
  AuthenticatedRequest,
} from "../middleware/auth";
import { extractClubContext, requireClubRole } from "../middleware/club";
import { validationResult } from "express-validator";

const router = Router();

const isAllClubsRequested = (req: Request): boolean => {
  const value = req.query.allClubs as any;
  if (Array.isArray(value)) {
    return value.includes("true") || value.includes("1");
  }
  return value === "true" || value === true || value === "1";
};

// Apply auth to all routes
router.use(authenticateToken);

/**
 * Routes that do NOT require club context - place before extractClubContext middleware
 */

/**
 * @route POST /api/members/request
 * @desc Request membership to a club
 * @access Private (Authenticated users)
 */
router.post("/request", requestClubMembership);

/**
 * @route GET /api/members/my-requests
 * @desc Get current user's membership requests
 * @access Private (Authenticated users)
 */
router.get("/my-requests", getMyMembershipRequests);

/**
 * @route DELETE /api/members/requests/:membershipId/cancel
 * @desc Cancel a pending membership request
 * @access Private (Authenticated users)
 */
router.delete("/requests/:membershipId/cancel", cancelMembershipRequest);

/**
 * @route GET /api/members/admin/pending
 * @desc Get pending members awaiting approval across all clubs (superadmin only)
 * @access Private (Superadmin)
 */
router.get(
  "/admin/pending",
  (req: Request, res: Response, next: NextFunction) => {
    const isPlatformAdmin =
      (req as any).user?.platformRole === "platform_admin";
    const isSuperAdmin =
      (req as any).user?.role === "superadmin" ||
      (req as any).user?.role === "platform_admin";
    if ((isPlatformAdmin || isSuperAdmin) && isAllClubsRequested(req)) {
      (req as any).allClubs = true;
      return getPendingMembers(req as AuthenticatedRequest, res, next);
    }
    return next();
  },
);

/**
 * @route GET /api/members/admin/inactive
 * @desc Get inactive/deactivated members across all clubs (superadmin only)
 * @access Private (Superadmin)
 */
router.get(
  "/admin/inactive",
  (req: Request, res: Response, next: NextFunction) => {
    const isPlatformAdmin =
      (req as any).user?.platformRole === "platform_admin";
    const isSuperAdmin =
      (req as any).user?.role === "superadmin" ||
      (req as any).user?.role === "platform_admin";
    if ((isPlatformAdmin || isSuperAdmin) && isAllClubsRequested(req)) {
      (req as any).allClubs = true;
      return getInactiveMembers(req as AuthenticatedRequest, res, next);
    }
    return next();
  },
);

// Apply club context to all routes below this point
router.use(extractClubContext);

// Validation middleware
const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      error: "Validation failed",
      details: errors.array(),
    });
    return;
  }
  next();
};

/**
 * @route GET /api/members
 * @desc Get all members with filtering and pagination
 * @access Private
 */
router.get(
  "/",
  authenticateToken,
  extractClubContext,
  getMembersValidation,
  handleValidationErrors,
  getMembers,
);

/**
 * @route GET /api/members/search
 * @desc Search members by name, username, or email
 * @access Private
 */
router.get("/search", searchMembers);

/**
 * @route GET /api/members/stats
 * @desc Get member statistics (admin only)
 * @access Private (Club Admin)
 */
router.get("/stats", requireClubRole(["admin"]), getMemberStats);

/**
 * @route GET /api/members/admin/pending
 * @desc Get pending members awaiting approval (admin only)
 * @access Private (Club Admin)
 */
router.get("/admin/pending", requireClubRole(["admin"]), getPendingMembers);

/**
 * @route GET /api/members/admin/inactive
 * @desc Get inactive/deactivated members (admin only)
 * @access Private (Club Admin)
 */
router.get("/admin/inactive", requireClubRole(["admin"]), getInactiveMembers);

/**
 * @route PUT /api/members/:id/approval
 * @desc Update member approval status (admin only)
 * @access Private (Club Admin)
 * IMPORTANT: Must come before generic /:id route
 */
router.put(
  "/:id/approval",
  requireClubRole(["admin"]),
  preventImpersonationFor(["approve members"]),
  updateMemberApproval,
);

/**
 * @route PUT /api/members/:id/role
 * @desc Update member role within club (admin only)
 * @access Private (Club Admin)
 * IMPORTANT: Must come before generic /:id route
 */
router.put(
  "/:id/role",
  requireClubRole(["admin"]),
  preventImpersonationFor(["change roles"]),
  updateMemberRole,
);

/**
 * @route GET /api/members/:id/activity
 * @desc Get member activity feed
 * @access Private
 * IMPORTANT: Must come before generic /:id route
 */
router.get("/:id/activity", getMemberActivity);

/**
 * @route GET /api/members/:id
 * @desc Get member profile details
 * @access Private
 */
router.get("/:id", getMemberProfile);

/**
 * @route DELETE /api/members/:id
 * @desc Deactivate member (admin only)
 * @access Private (Club Admin)
 */
router.delete(
  "/:id",
  requireClubRole(["admin"]),
  preventImpersonationFor(["delete members"]),
  deleteMember,
);

/**
 * @route PUT /api/members/:id/reactivate
 * @desc Reactivate a deactivated member (admin only)
 * @access Private (Club Admin)
 */
router.put(
  "/:id/reactivate",
  requireClubRole(["admin"]),
  preventImpersonationFor(["reactivate members"]),
  reactivateMember,
);

/**
 * @route PUT /api/members/:id/reset-password
 * @desc Reset member password to default (admin only)
 * @access Private (Club Admin)
 */
router.put(
  "/:id/reset-password",
  requireClubRole(["admin"]),
  resetMemberPassword,
);

export default router;
