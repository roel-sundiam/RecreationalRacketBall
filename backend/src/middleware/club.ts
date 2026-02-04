import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import ClubMembership from "../models/ClubMembership";
import Club from "../models/Club";

// Extend Express Request to include club context
declare global {
  namespace Express {
    interface Request {
      clubId?: mongoose.Types.ObjectId;
      clubMembership?: any;
      clubRole?: "member" | "admin" | "treasurer";
    }
  }
}

/**
 * Middleware to extract club context from request
 * Looks for clubId in: JWT payload, request headers, body, or params
 * Verifies user is a member of the club
 *
 * Special case: Platform admins can bypass club requirement with allClubs=true query param
 */
export const extractClubContext = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // Check if this is a platform admin requesting all clubs
    const isPlatformAdmin =
      (req as any).user?.platformRole === "platform_admin";
    const isSuperAdmin =
      (req as any).user?.role === "superadmin" ||
      (req as any).user?.role === "platform_admin";
    const allClubsQuery = req.query.allClubs;
    const allClubsRequested = Array.isArray(allClubsQuery)
      ? allClubsQuery.includes("true") || allClubsQuery.includes("1")
      : allClubsQuery === "true" || allClubsQuery === "1";

    console.log("🔍 extractClubContext check:", {
      isPlatformAdmin,
      isSuperAdmin,
      allClubsRequested,
      userRole: (req as any).user?.role,
      userPlatformRole: (req as any).user?.platformRole,
      queryAllClubs: req.query.allClubs,
    });

    // Platform admins and superadmins can bypass club selection with allClubs=true
    if ((isPlatformAdmin || isSuperAdmin) && allClubsRequested) {
      console.log(
        "🔓 Club context bypassed for platform admin/superadmin with allClubs=true",
      );
      // Set a flag to indicate this is a cross-club request
      (req as any).allClubs = true;
      next();
      return;
    }

    // Superadmins can bypass club requirement entirely (even without allClubs param)
    if (isSuperAdmin) {
      console.log("🔓 Superadmin accessing without club context requirement");
      // Check if a clubId was provided (optional for superadmins)
      let clubId: string | undefined;

      if ((req as any).user?.selectedClubId) {
        clubId = (req as any).user.selectedClubId;
      } else if (req.headers["x-club-id"]) {
        clubId = req.headers["x-club-id"] as string;
      } else if (req.query?.clubId) {
        clubId = req.query.clubId as string;
      } else if (req.body?.clubId) {
        clubId = req.body.clubId;
      } else if (req.params?.clubId) {
        clubId = req.params.clubId;
      }

      // If clubId provided, validate and set it; otherwise proceed without club context
      if (clubId && mongoose.Types.ObjectId.isValid(clubId)) {
        const clubObjectId = new mongoose.Types.ObjectId(clubId);
        const club = await Club.findById(clubObjectId);
        if (club) {
          req.clubId = clubObjectId;
          req.clubRole = "admin";
          console.log(`✅ Superadmin with club context: ${club.name}`);
        }
      } else {
        console.log(`✅ Superadmin proceeding without club context`);
      }
      next();
      return;
    }

    // Get clubId from various sources (priority order)
    let clubId: string | undefined;

    // 1. From JWT (selectedClubId)
    if ((req as any).user?.selectedClubId) {
      clubId = (req as any).user.selectedClubId;
    }

    // 2. From request header
    if (!clubId && req.headers["x-club-id"]) {
      clubId = req.headers["x-club-id"] as string;
    }

    // 3. From request body
    if (!clubId && req.body?.clubId) {
      clubId = req.body.clubId;
    }

    // 4. From URL params
    if (!clubId && req.params?.clubId) {
      clubId = req.params.clubId;
    }

    // Validate clubId is present
    if (!clubId) {
      res.status(400).json({
        success: false,
        message:
          "Club context is required. Please select a club or provide clubId.",
      });
      return;
    }

    // Validate clubId format
    if (!mongoose.Types.ObjectId.isValid(clubId)) {
      res.status(400).json({
        success: false,
        message: "Invalid club ID format",
      });
      return;
    }

    const clubObjectId = new mongoose.Types.ObjectId(clubId);

    // Verify club exists
    const club = await Club.findById(clubObjectId);
    if (!club) {
      res.status(404).json({
        success: false,
        message: "Club not found",
      });
      return;
    }

    // Check if club is active
    if (club.status === "suspended") {
      res.status(403).json({
        success: false,
        message: "This club has been suspended. Please contact support.",
      });
      return;
    }

    // Get user ID from authenticated request
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    // Check if user is platform admin (bypasses club membership check)
    if (isPlatformAdmin) {
      // Platform admins can access any club without membership
      req.clubId = clubObjectId;
      req.clubRole = "admin"; // Grant admin privileges
      console.log(`🔑 Platform admin accessing club: ${club.name}`);
      next();
      return;
    }

    // Verify user is a member of this club
    const membership = await ClubMembership.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      clubId: clubObjectId,
      status: "approved",
    });

    if (!membership) {
      res.status(403).json({
        success: false,
        message:
          "You are not a member of this club or your membership is pending approval.",
      });
      return;
    }

    // Attach club context to request
    req.clubId = clubObjectId;
    req.clubMembership = membership;
    req.clubRole = membership.role;

    console.log(
      `✅ Club context: ${club.name}, User: ${userId}, Role: ${membership.role}`,
    );
    next();
  } catch (error) {
    console.error("❌ Error in extractClubContext middleware:", error);
    res.status(500).json({
      success: false,
      message: "Failed to extract club context",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Middleware to require specific club roles
 * Must be used AFTER extractClubContext middleware
 *
 * @param allowedRoles - Array of roles that are allowed to access the route
 */
export const requireClubRole = (
  allowedRoles: Array<"member" | "admin" | "treasurer">,
) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      // Platform admins and superadmins bypass role checks
      const isPlatformAdmin =
        (req as any).user?.platformRole === "platform_admin";
      const isSuperAdmin = (req as any).user?.role === "superadmin";

      if (isPlatformAdmin || isSuperAdmin) {
        console.log("🔑 Platform admin/superadmin bypassing role check");
        next();
        return;
      }

      // Check if this is a cross-club request (allClubs=true was set by extractClubContext)
      if ((req as any).allClubs) {
        console.log("🔑 Cross-club request already authorized");
        next();
        return;
      }

      // Check if club context was extracted
      if (!req.clubRole) {
        res.status(500).json({
          success: false,
          message:
            "Club context not found. Ensure extractClubContext middleware is applied first.",
        });
        return;
      }

      // Check if user has required role
      if (!allowedRoles.includes(req.clubRole)) {
        res.status(403).json({
          success: false,
          message: `Insufficient permissions. Required role: ${allowedRoles.join(" or ")}. Your role: ${req.clubRole}`,
        });
        return;
      }

      console.log(
        `✅ Role check passed: ${req.clubRole} in [${allowedRoles.join(", ")}]`,
      );
      next();
    } catch (error) {
      console.error("❌ Error in requireClubRole middleware:", error);
      res.status(500).json({
        success: false,
        message: "Failed to check club role",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };
};

/**
 * Middleware to require club admin role
 * Convenience wrapper for requireClubRole(['admin'])
 */
export const requireClubAdmin = requireClubRole(["admin"]);

/**
 * Middleware to require club admin or treasurer role
 * Convenience wrapper for requireClubRole(['admin', 'treasurer'])
 */
export const requireClubAdminOrTreasurer = requireClubRole([
  "admin",
  "treasurer",
]);

/**
 * Helper function to get user's clubs with role information
 * Used in authentication routes
 */
export const getUserClubsWithRoles = async (
  userId: mongoose.Types.ObjectId,
) => {
  try {
    const memberships = await ClubMembership.find({
      userId,
      status: { $in: ["pending", "approved"] },
    })
      .populate("clubId", "name slug logo primaryColor accentColor status")
      .lean();

    return memberships.map((membership) => ({
      _id: (membership._id as any).toString(),
      clubId: (membership.clubId as any)._id.toString(),
      clubName: (membership.clubId as any).name,
      clubSlug: (membership.clubId as any).slug,
      clubLogo: (membership.clubId as any).logo,
      clubPrimaryColor: (membership.clubId as any).primaryColor,
      clubAccentColor: (membership.clubId as any).accentColor,
      clubStatus: (membership.clubId as any).status,
      role: membership.role,
      status: membership.status,
      joinedAt: membership.joinedAt,
      creditBalance: membership.creditBalance,
      seedPoints: membership.seedPoints,
    }));
  } catch (error) {
    console.error("Error getting user clubs:", error);
    return [];
  }
};
