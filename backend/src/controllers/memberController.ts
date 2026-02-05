import { Response } from "express";
import { query } from "express-validator";
import User from "../models/User";
import ClubMembership from "../models/ClubMembership";
import Reservation from "../models/Reservation";
import Payment from "../models/Payment";
import Club from "../models/Club";
import ClubSettings from "../models/ClubSettings";
import { AuthenticatedRequest } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";

// Get all members with filtering and pagination
export const getMembers = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    // Check if this is a cross-club request (superadmin with allClubs=true)
    const allClubs = (req as any).allClubs === true;

    // Require clubId unless this is a cross-club request
    if (!allClubs && !req.clubId) {
      return res.status(400).json({
        success: false,
        error: "Club context is required",
      });
    }

    // Build filter query for ClubMembership
    const membershipFilter: any = {
      role: { $in: ["member", "admin", "treasurer"] },
    };

    // Only filter by clubId if not a cross-club request
    if (!allClubs) {
      membershipFilter.clubId = req.clubId;
    }

    // Include active/approved filters unless explicitly requesting all users
    if (!req.query.includeAll) {
      membershipFilter.status = "approved";
    }

    // Filter by role
    if (
      req.query.role &&
      ["member", "admin", "treasurer"].includes(req.query.role as string)
    ) {
      membershipFilter.role = req.query.role;
    }

    // Sort options for membership
    let sortOption: any = { joinedAt: -1 }; // Default sort by join date
    if (req.query.sort) {
      switch (req.query.sort) {
        case "newest":
          sortOption = { joinedAt: -1 };
          break;
        case "oldest":
          sortOption = { joinedAt: 1 };
          break;
        case "seedPoints":
          sortOption = { seedPoints: -1 };
          break;
        case "creditBalance":
          sortOption = { creditBalance: -1 };
          break;
      }
    }

    // Get memberships with user data
    const populateOptions: any = [
      {
        path: "userId",
        select:
          "fullName username email gender profilePicture registrationDate lastLogin isActive isApproved isHomeowner",
      },
    ];

    // For cross-club requests, also populate club information
    if (allClubs) {
      populateOptions.push({
        path: "clubId",
        select: "name slug",
      });
    }

    const memberships = await ClubMembership.find(membershipFilter)
      .populate(populateOptions)
      .sort(sortOption)
      .skip(skip)
      .limit(limit);

    const total = await ClubMembership.countDocuments(membershipFilter);

    // Apply search filter on user data if needed
    let filteredMemberships = memberships;
    if (req.query.search) {
      const searchTerm = (req.query.search as string).toLowerCase();
      filteredMemberships = memberships.filter((membership: any) => {
        const user = membership.userId;
        if (!user) return false;
        return (
          user.fullName?.toLowerCase().includes(searchTerm) ||
          user.username?.toLowerCase().includes(searchTerm) ||
          user.email?.toLowerCase().includes(searchTerm)
        );
      });
    }

    // Apply gender filter on user data if needed
    if (req.query.gender) {
      filteredMemberships = filteredMemberships.filter((membership: any) => {
        return membership.userId?.gender === req.query.gender;
      });
    }

    // Fetch 2026 membership payment amounts for all members
    const userIds = filteredMemberships
      .map((m: any) => m.userId?._id)
      .filter(Boolean);

    const paymentFilter: any = {
      userId: { $in: userIds },
      paymentType: "membership_fee",
      membershipYear: 2026,
      status: "record",
    };

    // Only filter by clubId if not a cross-club request
    if (!allClubs) {
      paymentFilter.clubId = req.clubId;
    }

    const payments2026 =
      await Payment.find(paymentFilter).select("userId amount");

    // Create a map of userId -> payment amount
    const paymentMap = new Map();
    payments2026.forEach((payment: any) => {
      const userIdStr =
        typeof payment.userId === "string"
          ? payment.userId
          : payment.userId.toString();
      paymentMap.set(userIdStr, payment.amount);
    });

    // Transform memberships to include user data and club-specific fields
    const membersWithPayments = filteredMemberships
      .map((membership: any) => {
        const user = membership.userId;
        if (!user) return null;

        const userObj = user.toObject ? user.toObject() : user;
        const membershipObj = membership.toObject();
        const amount = paymentMap.get(user._id.toString());

        // Debug logging
        if (amount) {
          console.log(`✅ ${user.fullName}: ₱${amount}`);
        }

        const result: any = {
          ...userObj,
          // Club-specific fields from ClubMembership
          clubRole: membershipObj.role,
          clubStatus: membershipObj.status,
          creditBalance: membershipObj.creditBalance,
          seedPoints: membershipObj.seedPoints,
          matchesWon: membershipObj.matchesWon,
          matchesPlayed: membershipObj.matchesPlayed,
          membershipFeesPaid: membershipObj.membershipFeesPaid,
          membershipYearsPaid: membershipObj.membershipYearsPaid,
          joinedAt: membershipObj.joinedAt,
          approvedAt: membershipObj.approvedAt,
          membership2026Amount: amount || null,
          membershipId: membershipObj._id,
        };

        // Include club information for cross-club requests
        if (allClubs && membershipObj.clubId) {
          const club = membershipObj.clubId;
          result.clubId =
            typeof club === "string" ? club : club._id?.toString();
          result.clubName = club.name;
        }

        return result;
      })
      .filter(Boolean);

    console.log(
      `📊 Found ${payments2026.length} payments for ${filteredMemberships.length} members`,
    );

    return res.status(200).json({
      success: true,
      data: membersWithPayments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    });
  },
);

// Get member profile details
export const getMemberProfile = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    // Require clubId
    if (!req.clubId) {
      return res.status(400).json({
        success: false,
        error: "Club context is required",
      });
    }

    // Get club membership first
    const membership = await ClubMembership.findOne({
      userId: id,
      clubId: req.clubId,
      status: "approved",
    }).populate(
      "userId",
      "fullName username email gender phone dateOfBirth profilePicture registrationDate lastLogin isActive isApproved",
    );

    if (!membership || !membership.userId) {
      return res.status(404).json({
        success: false,
        error: "Member not found in this club",
      });
    }

    const user = membership.userId as any;

    // Get member statistics (club-specific)
    const stats = await Promise.all([
      // Total reservations in this club
      Reservation.countDocuments({ userId: id, clubId: req.clubId }),
      // Completed reservations in this club
      Reservation.countDocuments({
        userId: id,
        clubId: req.clubId,
        status: "completed",
      }),
      // Recent activity (last 5 reservations in this club)
      Reservation.find({ userId: id, clubId: req.clubId })
        .sort({ createdAt: -1 })
        .limit(5)
        .select("date timeSlot status createdAt"),
    ]);

    const memberStats = {
      totalReservations: stats[0],
      completedReservations: stats[1],
      matchesWon: membership.matchesWon,
      matchesPlayed: membership.matchesPlayed,
      seedPoints: membership.seedPoints,
      creditBalance: membership.creditBalance,
      recentActivity: stats[2],
    };

    const membershipObj = membership.toObject();
    const userObj = user.toObject ? user.toObject() : user;

    return res.status(200).json({
      success: true,
      data: {
        ...userObj,
        // Club-specific fields
        clubRole: membershipObj.role,
        clubStatus: membershipObj.status,
        creditBalance: membershipObj.creditBalance,
        seedPoints: membershipObj.seedPoints,
        matchesWon: membershipObj.matchesWon,
        matchesPlayed: membershipObj.matchesPlayed,
        membershipFeesPaid: membershipObj.membershipFeesPaid,
        membershipYearsPaid: membershipObj.membershipYearsPaid,
        joinedAt: membershipObj.joinedAt,
        approvedAt: membershipObj.approvedAt,
        stats: memberStats,
      },
    });
  },
);

// Get member activity feed
export const getMemberActivity = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Require clubId
    if (!req.clubId) {
      return res.status(400).json({
        success: false,
        error: "Club context is required",
      });
    }

    // Check if member exists in this club
    const membership = await ClubMembership.findOne({
      userId: id,
      clubId: req.clubId,
      status: "approved",
    });

    if (!membership) {
      return res.status(404).json({
        success: false,
        error: "Member not found in this club",
      });
    }

    // Privacy check - only show own activity unless club admin
    if (req.clubRole === "member" && req.userId !== id) {
      return res.status(403).json({
        success: false,
        error: "Access denied",
      });
    }

    // Get recent activities (club-specific)
    const activities = await Promise.all([
      // Recent reservations in this club
      Reservation.find({ userId: id, clubId: req.clubId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("date timeSlot status createdAt"),
    ]);

    // Combine and sort activities by date
    const combinedActivities = [
      ...activities[0].map((reservation) => ({
        type: "reservation",
        date: reservation.createdAt,
        data: reservation,
      })),
    ]
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, limit);

    return res.status(200).json({
      success: true,
      data: combinedActivities,
    });
  },
);

// Get member statistics (admin only)
export const getMemberStats = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { startDate, endDate } = req.query;

    // Require clubId
    if (!req.clubId) {
      return res.status(400).json({
        success: false,
        error: "Club context is required",
      });
    }

    const start = startDate
      ? new Date(startDate as string)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default: 30 days ago
    const end = endDate ? new Date(endDate as string) : new Date();

    if (end) {
      end.setHours(23, 59, 59, 999);
    }

    // Get member statistics (club-specific)
    const stats = await Promise.all([
      // Total members in club
      ClubMembership.countDocuments({
        clubId: req.clubId,
        status: "approved",
        role: { $in: ["member", "admin", "treasurer"] },
      }),

      // New members in period
      ClubMembership.countDocuments({
        clubId: req.clubId,
        status: "approved",
        role: { $in: ["member", "admin", "treasurer"] },
        joinedAt: { $gte: start, $lte: end },
      }),

      // Get active members by checking recent login (need to populate userId)
      ClubMembership.find({
        clubId: req.clubId,
        status: "approved",
      })
        .populate({
          path: "userId",
          match: {
            lastLogin: {
              $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            },
          },
        })
        .then((memberships) => memberships.filter((m) => m.userId).length),

      // Gender distribution (need to populate user data)
      ClubMembership.find({
        clubId: req.clubId,
        status: "approved",
      })
        .populate("userId", "gender")
        .then((memberships) => {
          const genderCounts: { [key: string]: number } = {};
          memberships.forEach((m: any) => {
            if (m.userId?.gender) {
              genderCounts[m.userId.gender] =
                (genderCounts[m.userId.gender] || 0) + 1;
            }
          });
          return Object.entries(genderCounts).map(([gender, count]) => ({
            _id: gender,
            count,
          }));
        }),

      // Members with paid fees
      ClubMembership.countDocuments({
        clubId: req.clubId,
        status: "approved",
        role: { $in: ["member", "admin", "treasurer"] },
        membershipFeesPaid: true,
      }),

      // Average credit balance and seed points
      ClubMembership.aggregate([
        {
          $match: {
            clubId: req.clubId,
            status: "approved",
          },
        },
        {
          $group: {
            _id: null,
            avgCreditBalance: { $avg: "$creditBalance" },
            totalCredit: { $sum: "$creditBalance" },
            avgSeedPoints: { $avg: "$seedPoints" },
            totalSeedPoints: { $sum: "$seedPoints" },
          },
        },
      ]),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        totalMembers: stats[0],
        newMembers: stats[1],
        activeMembers: stats[2],
        genderDistribution: stats[3],
        membersWithPaidFees: stats[4],
        clubStats: stats[5][0] || {
          avgCreditBalance: 0,
          totalCredit: 0,
          avgSeedPoints: 0,
          totalSeedPoints: 0,
        },
        period: {
          startDate: start.toISOString(),
          endDate: end.toISOString(),
        },
      },
    });
  },
);

// Search members
export const searchMembers = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { q } = req.query;

    // Require clubId
    if (!req.clubId) {
      return res.status(400).json({
        success: false,
        error: "Club context is required",
      });
    }

    if (!q || (q as string).length < 2) {
      return res.status(400).json({
        success: false,
        error: "Search query must be at least 2 characters long",
      });
    }

    const searchTerm = q as string;
    const limit = parseInt(req.query.limit as string) || 10;

    // Get all approved members in the club
    const memberships = await ClubMembership.find({
      clubId: req.clubId,
      status: "approved",
    })
      .populate({
        path: "userId",
        select: "fullName username email profilePicture isActive isApproved",
      })
      .limit(limit * 2); // Get more to account for filtering

    // Filter by search term
    const filteredMembers = memberships
      .filter((membership: any) => {
        const user = membership.userId;
        if (!user || !user.isActive) return false;

        const searchLower = searchTerm.toLowerCase();
        return (
          user.fullName?.toLowerCase().includes(searchLower) ||
          user.username?.toLowerCase().includes(searchLower) ||
          user.email?.toLowerCase().includes(searchLower)
        );
      })
      .slice(0, limit)
      .map((membership: any) => {
        const user = membership.userId;
        const userObj = user.toObject ? user.toObject() : user;
        return {
          ...userObj,
          clubRole: membership.role,
          seedPoints: membership.seedPoints,
          creditBalance: membership.creditBalance,
        };
      });

    return res.status(200).json({
      success: true,
      data: filteredMembers,
    });
  },
);

// Update member approval status (Admin only)
export const updateMemberApproval = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    console.log("🚨🚨🚨 UPDATE MEMBER APPROVAL FUNCTION CALLED 🚨🚨🚨");

    const { id } = req.params;
    const { isApproved, membershipFeesPaid, notes } = req.body;

    console.log("🔍 Params ID:", id);
    console.log("🔍 Request body:", req.body);

    if (!id) {
      console.log("❌ No ID provided");
      return res.status(400).json({
        success: false,
        error: "Member ID is required",
      });
    }

    // Require clubId
    if (!req.clubId) {
      console.log("❌ No clubId in request");
      return res.status(400).json({
        success: false,
        error: "Club context is required",
      });
    }

    // Check if user is club admin
    if (req.clubRole !== "admin" && req.clubRole !== "treasurer") {
      console.log("❌ Not admin or treasurer:", req.clubRole);
      return res.status(403).json({
        success: false,
        error: "Access denied. Admin privileges required.",
      });
    }

    try {
      // Debug logging
      console.log("🔍 Approving member - MembershipId:", id);
      console.log("🔍 Approving member - ClubId from context:", req.clubId);
      console.log("🔍 Approving member - User role:", req.clubRole);

      // Find the membership record first (id is membershipId, not userId)
      const membership = await ClubMembership.findById(id).populate(
        "userId",
        "username fullName",
      );

      if (!membership) {
        console.error("❌ Membership not found with ID:", id);
        return res.status(404).json({
          success: false,
          error: "Membership record not found",
        });
      }

      console.log(
        "✅ Found membership - ClubId:",
        membership.clubId.toString(),
      );
      console.log("✅ Found membership - UserId:", membership.userId);

      // Verify the membership belongs to the current club
      if (membership.clubId.toString() !== req.clubId?.toString()) {
        console.error(
          "❌ Club mismatch - Membership club:",
          membership.clubId.toString(),
          "Request club:",
          req.clubId?.toString(),
        );
        return res.status(403).json({
          success: false,
          error: "This member does not belong to your selected club",
        });
      }

      // Update fields
      const updateFields: any = {};

      // Map isApproved to status
      if (typeof isApproved === "boolean") {
        updateFields.status = isApproved ? "approved" : "pending";
        if (isApproved) {
          updateFields.approvedAt = new Date();
          updateFields.approvedBy = req.userId;
        }
      }

      if (typeof membershipFeesPaid === "boolean") {
        updateFields.membershipFeesPaid = membershipFeesPaid;
      }

      const updatedMembership = await ClubMembership.findByIdAndUpdate(
        id,
        updateFields,
        { new: true },
      ).populate("userId", "username fullName email");

      const user = updatedMembership?.userId as any;

      // Also update the User model's isApproved field (backward compatibility)
      if (typeof isApproved === "boolean" && user?._id) {
        const userUpdateFields: any = { isApproved: isApproved };

        // If approving the member, set their selectedClubId to this club
        if (isApproved && updatedMembership?.clubId) {
          userUpdateFields.selectedClubId = updatedMembership.clubId;
          console.log(
            `📌 Setting selectedClubId for ${user?.username} to ${updatedMembership.clubId}`,
          );
        }

        await User.findByIdAndUpdate(user._id, userUpdateFields);
        console.log(
          `✅ Updated User.isApproved to ${isApproved} for ${user?.username}`,
        );
      }

      console.log(
        `👤 Membership for ${user?.username} updated by ${req.user?.username}:`,
        updateFields,
      );

      return res.status(200).json({
        success: true,
        message: `Membership for ${user?.fullName} updated successfully`,
        data: {
          ...user?.toObject(),
          clubRole: updatedMembership?.role,
          clubStatus: updatedMembership?.status,
          membershipFeesPaid: updatedMembership?.membershipFeesPaid,
          creditBalance: updatedMembership?.creditBalance,
          seedPoints: updatedMembership?.seedPoints,
        },
      });
    } catch (error) {
      console.error("Error updating member:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to update member",
      });
    }
  },
);

// Update member role (Club admin only)
export const updateMemberRole = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { role } = req.body;
    const isSuperAdmin =
      req.user?.role === "superadmin" ||
      (req as any).user?.role === "platform_admin" ||
      (req as any).user?.platformRole === "platform_admin";

    if (!id) {
      return res.status(400).json({
        success: false,
        error: "Member ID is required",
      });
    }

    // Require clubId unless superadmin (superadmin can derive club from membership)
    if (!req.clubId && !isSuperAdmin) {
      return res.status(400).json({
        success: false,
        error: "Club context is required",
      });
    }

    // Check if user is club admin (superadmins bypass)
    if (!isSuperAdmin && req.clubRole !== "admin") {
      return res.status(403).json({
        success: false,
        error: "Access denied. Club admin privileges required to change roles.",
      });
    }

    // Validate role (club-specific roles only)
    const validRoles = ["member", "admin", "treasurer"];
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: `Invalid role. Must be one of: ${validRoles.join(", ")}`,
      });
    }

    try {
      // Find the membership record (id is membershipId)
      const membershipFilter: any = { _id: id };

      // If club context is available, enforce it
      if (req.clubId) {
        membershipFilter.clubId = req.clubId;
      }

      const membership = await ClubMembership.findOne(
        membershipFilter,
      ).populate("userId", "username fullName");

      // If superadmin without club context, derive it from membership
      if (membership && !req.clubId) {
        req.clubId = membership.clubId as any;
      }

      if (!membership) {
        return res.status(404).json({
          success: false,
          error: "Member not found in this club",
        });
      }

      const user = membership.userId as any;

      // Prevent changing own role
      if (user._id.toString() === req.userId) {
        return res.status(400).json({
          success: false,
          error: "You cannot change your own role",
        });
      }

      const oldRole = membership.role;

      // Update role
      const updateFilter: any = { _id: id };
      if (req.clubId) {
        updateFilter.clubId = req.clubId;
      }

      const updatedMembership = await ClubMembership.findOneAndUpdate(
        updateFilter,
        { role },
        { new: true },
      ).populate("userId", "username fullName email");

      const updatedUser = updatedMembership?.userId as any;

      console.log(
        `👤 Club role changed: ${user.username} from ${oldRole} to ${role} by ${req.user?.username}`,
      );

      return res.status(200).json({
        success: true,
        message: `${updatedUser?.fullName}'s role changed from ${oldRole} to ${role}`,
        data: {
          ...updatedUser?.toObject(),
          clubRole: updatedMembership?.role,
          clubStatus: updatedMembership?.status,
          creditBalance: updatedMembership?.creditBalance,
          seedPoints: updatedMembership?.seedPoints,
        },
      });
    } catch (error) {
      console.error("Error updating member role:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to update member role",
      });
    }
  },
);

// Delete member (Admin only) - Suspends club membership
export const deleteMember = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: "Member ID is required",
      });
    }

    // Require clubId
    if (!req.clubId) {
      return res.status(400).json({
        success: false,
        error: "Club context is required",
      });
    }

    // Check if user is club admin
    if (req.clubRole !== "admin") {
      return res.status(403).json({
        success: false,
        error: "Access denied. Admin privileges required.",
      });
    }

    try {
      // Find the membership record (id is membershipId)
      const membership = await ClubMembership.findOne({
        _id: id,
        clubId: req.clubId,
      }).populate("userId", "username fullName");

      if (!membership) {
        return res.status(404).json({
          success: false,
          error: "Member not found in this club",
        });
      }

      const user = membership.userId as any;

      // Instead of deleting, mark membership as suspended
      const updatedMembership = await ClubMembership.findByIdAndUpdate(
        id,
        {
          status: "suspended",
        },
        { new: true },
      ).populate("userId", "username fullName email");

      const updatedUser = updatedMembership?.userId as any;

      console.log(
        `🗑️ Membership for ${user.username} suspended by ${req.user?.username}`,
      );

      return res.status(200).json({
        success: true,
        message: `Membership for ${user.fullName} has been suspended`,
        data: {
          ...updatedUser?.toObject(),
          clubRole: updatedMembership?.role,
          clubStatus: updatedMembership?.status,
        },
      });
    } catch (error) {
      console.error("Error suspending membership:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to suspend membership",
      });
    }
  },
);

// Reactivate member (admin only) - Reactivates suspended club membership
export const reactivateMember = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: "Member ID is required",
      });
    }

    // Require clubId
    if (!req.clubId) {
      return res.status(400).json({
        success: false,
        error: "Club context is required",
      });
    }

    // Check if user is club admin
    if (req.clubRole !== "admin") {
      return res.status(403).json({
        success: false,
        error: "Access denied. Admin privileges required.",
      });
    }

    try {
      // Find the membership record (id is membershipId)
      const membership = await ClubMembership.findOne({
        _id: id,
        clubId: req.clubId,
      }).populate("userId", "username fullName");

      if (!membership) {
        return res.status(404).json({
          success: false,
          error: "Member not found in this club",
        });
      }

      const user = membership.userId as any;

      // Reactivate the membership
      const updatedMembership = await ClubMembership.findByIdAndUpdate(
        id,
        {
          status: "approved",
        },
        { new: true },
      ).populate("userId", "username fullName email");

      const updatedUser = updatedMembership?.userId as any;

      console.log(
        `✅ Membership for ${user.username} reactivated by ${req.user?.username}`,
      );

      return res.status(200).json({
        success: true,
        message: `Membership for ${user.fullName} has been reactivated`,
        data: {
          ...updatedUser?.toObject(),
          clubRole: updatedMembership?.role,
          clubStatus: updatedMembership?.status,
          creditBalance: updatedMembership?.creditBalance,
          seedPoints: updatedMembership?.seedPoints,
        },
      });
    } catch (error) {
      console.error("Error reactivating membership:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to reactivate membership",
      });
    }
  },
);

// Get pending members (Admin only)
export const getPendingMembers = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    // Check if this is a cross-club request (superadmin with allClubs=true)
    const allClubs = (req as any).allClubs === true;

    // Require clubId unless this is a cross-club request
    if (!allClubs && !req.clubId) {
      return res.status(400).json({
        success: false,
        error: "Club context is required",
      });
    }

    // Check if user is club admin (skip for cross-club requests which are already authorized)
    if (!allClubs && req.clubRole !== "admin" && req.clubRole !== "treasurer") {
      return res.status(403).json({
        success: false,
        error: "Access denied. Admin privileges required.",
      });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    try {
      const filter: any = {
        status: "pending",
      };

      // Only filter by clubId if not a cross-club request
      if (!allClubs) {
        filter.clubId = req.clubId;
      }

      const populateOptions: any = [
        {
          path: "userId",
          select:
            "fullName username email gender profilePicture registrationDate isActive",
        },
      ];

      // For cross-club requests, also populate club information
      if (allClubs) {
        populateOptions.push({
          path: "clubId",
          select: "name slug",
        });
      }

      const [pendingMemberships, total] = await Promise.all([
        ClubMembership.find(filter)
          .populate(populateOptions)
          .sort({ joinedAt: -1 })
          .limit(limit)
          .skip(skip),
        ClubMembership.countDocuments(filter),
      ]);

      const totalPages = Math.ceil(total / limit);

      // Transform to include user data and membership info
      const pendingMembers = pendingMemberships
        .map((membership: any) => {
          const user = membership.userId;
          if (!user) return null;

          const userObj = user.toObject ? user.toObject() : user;
          const result: any = {
            ...userObj,
            clubRole: membership.role,
            clubStatus: membership.status,
            joinedAt: membership.joinedAt,
            membershipId: membership._id,
          };

          // Include club information for cross-club requests
          if (allClubs && membership.clubId) {
            const club = membership.clubId;
            result.clubId =
              typeof club === "string" ? club : club._id?.toString();
            result.clubName = club.name;
          }

          return result;
        })
        .filter(Boolean);

      return res.status(200).json({
        success: true,
        data: pendingMembers,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      });
    } catch (error) {
      console.error("Error fetching pending members:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch pending members",
      });
    }
  },
);

// Get inactive members (Admin only) - Lists suspended memberships
export const getInactiveMembers = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    // Check if this is a cross-club request (superadmin with allClubs=true)
    const allClubs = (req as any).allClubs === true;

    // Require clubId unless this is a cross-club request
    if (!allClubs && !req.clubId) {
      return res.status(400).json({
        success: false,
        error: "Club context is required",
      });
    }

    // Check if user is club admin (skip for cross-club requests which are already authorized)
    if (!allClubs && req.clubRole !== "admin" && req.clubRole !== "treasurer") {
      return res.status(403).json({
        success: false,
        error: "Access denied. Admin privileges required.",
      });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    try {
      const filter: any = {
        status: "suspended",
      };

      // Only filter by clubId if not a cross-club request
      if (!allClubs) {
        filter.clubId = req.clubId;
      }

      const populateOptions: any = [
        {
          path: "userId",
          select:
            "fullName username email gender profilePicture registrationDate isActive",
        },
      ];

      // For cross-club requests, also populate club information
      if (allClubs) {
        populateOptions.push({
          path: "clubId",
          select: "name slug",
        });
      }

      const [inactiveMemberships, total] = await Promise.all([
        ClubMembership.find(filter)
          .populate(populateOptions)
          .sort({ updatedAt: -1 })
          .limit(limit)
          .skip(skip),
        ClubMembership.countDocuments(filter),
      ]);

      const totalPages = Math.ceil(total / limit);

      // Transform to include user data and membership info
      const inactiveMembers = inactiveMemberships
        .map((membership: any) => {
          const user = membership.userId;
          if (!user) return null;

          const userObj = user.toObject ? user.toObject() : user;
          const result: any = {
            ...userObj,
            clubRole: membership.role,
            clubStatus: membership.status,
            joinedAt: membership.joinedAt,
            suspendedAt: membership.updatedAt,
            membershipId: membership._id,
          };

          // Include club information for cross-club requests
          if (allClubs && membership.clubId) {
            const club = membership.clubId;
            result.clubId =
              typeof club === "string" ? club : club._id?.toString();
            result.clubName = club.name;
          }

          return result;
        })
        .filter(Boolean);

      return res.status(200).json({
        success: true,
        data: inactiveMembers,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      });
    } catch (error) {
      console.error("Error fetching inactive members:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch inactive members",
      });
    }
  },
);

// Reset member password to default (Admin only)
export const resetMemberPassword = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const defaultPassword = "RT2Tennis"; // Fixed default password

    if (!id) {
      return res.status(400).json({
        success: false,
        error: "Member ID is required",
      });
    }

    // Require clubId
    if (!req.clubId) {
      return res.status(400).json({
        success: false,
        error: "Club context is required",
      });
    }

    // Check if user is club admin
    if (req.clubRole !== "admin") {
      return res.status(403).json({
        success: false,
        error: "Access denied. Admin privileges required.",
      });
    }

    try {
      // Verify the user is a member of this club (id can be userId or membershipId)
      let membership = await ClubMembership.findOne({
        _id: id,
        clubId: req.clubId,
      }).populate("userId");

      // If not found by membershipId, try userId
      if (!membership) {
        membership = await ClubMembership.findOne({
          userId: id,
          clubId: req.clubId,
        }).populate("userId");
      }

      if (!membership || !membership.userId) {
        return res.status(404).json({
          success: false,
          error: "Member not found in this club",
        });
      }

      const user = membership.userId as any;

      // Don't allow resetting club admin passwords unless platform admin
      if (
        membership.role === "admin" &&
        req.user?.platformRole !== "platform_admin"
      ) {
        return res.status(403).json({
          success: false,
          error: "Cannot reset password for club administrators",
        });
      }

      // Update password directly - the pre-save hook will hash it
      const member = await User.findById(user._id);
      if (!member) {
        return res.status(404).json({
          success: false,
          error: "User not found",
        });
      }

      member.password = defaultPassword;
      await member.save();

      console.log(
        `🔑 Password reset for ${member.username} by ${req.user?.username}`,
      );

      return res.status(200).json({
        success: true,
        message: `Password for ${member.fullName} has been reset to "RT2Tennis"`,
      });
    } catch (error) {
      console.error("Error resetting member password:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to reset password",
      });
    }
  },
);

// Request membership to a club
export const requestClubMembership = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { clubId } = req.body;

    if (!clubId) {
      return res
        .status(400)
        .json({ success: false, error: "Club ID is required" });
    }

    // Validate club exists and is active
    const club = await Club.findById(clubId);
    if (!club) {
      return res.status(404).json({ success: false, error: "Club not found" });
    }

    if (club.status !== "active") {
      return res.status(400).json({
        success: false,
        error: "This club is not accepting new members at this time",
      });
    }

    // Check if already a member or has pending request
    const existingMembership = await ClubMembership.findOne({
      userId: req.userId,
      clubId: clubId,
    });

    if (existingMembership) {
      if (existingMembership.status === "approved") {
        return res.status(400).json({
          success: false,
          error: "You are already a member of this club",
        });
      }
      if (existingMembership.status === "pending") {
        return res.status(400).json({
          success: false,
          error: "You already have a pending request for this club",
        });
      }
      if (existingMembership.status === "rejected") {
        return res.status(400).json({
          success: false,
          error:
            "Your membership request was previously rejected. Please contact the club admin.",
        });
      }
    }

    // Get club settings for initial credit balance
    const clubSettings = await ClubSettings.findOne({ clubId });
    const initialCredit = clubSettings?.initialCreditBalance || 100;

    // Create membership request
    const membership = await ClubMembership.create({
      userId: req.userId,
      clubId: clubId,
      role: "member",
      status: "pending",
      membershipFeesPaid: false,
      creditBalance: initialCredit,
      seedPoints: 0,
    });

    const populated = await ClubMembership.findById(membership._id)
      .populate("clubId", "name slug logo primaryColor")
      .populate("userId", "fullName username email");

    if (populated) {
      console.log(
        `📩 Membership request: ${(populated.userId as any).username} → ${(populated.clubId as any).name}`,
      );
    }

    return res.status(201).json({
      success: true,
      message:
        "Membership request submitted successfully. Please wait for admin approval.",
      data: populated,
    });
  },
);

// Get user's membership requests
export const getMyMembershipRequests = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const memberships = await ClubMembership.find({
      userId: req.userId,
    })
      .populate("clubId", "name slug logo primaryColor accentColor status")
      .sort({ joinedAt: -1 });

    const formattedRequests = memberships.map((m: any) => ({
      _id: m._id,
      club: m.clubId,
      status: m.status,
      role: m.role,
      joinedAt: m.joinedAt,
      approvedAt: m.approvedAt,
      creditBalance: m.creditBalance,
      seedPoints: m.seedPoints,
    }));

    return res.status(200).json({
      success: true,
      data: formattedRequests,
    });
  },
);

// Cancel pending membership request
export const cancelMembershipRequest = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { membershipId } = req.params;

    const membership = await ClubMembership.findOne({
      _id: membershipId,
      userId: req.userId,
    });

    if (!membership) {
      return res.status(404).json({
        success: false,
        error: "Membership request not found",
      });
    }

    if (membership.status !== "pending") {
      return res.status(400).json({
        success: false,
        error: "Only pending requests can be cancelled",
      });
    }

    await ClubMembership.findByIdAndDelete(membershipId);

    console.log(`❌ Membership request cancelled by user: ${req.userId}`);

    return res.status(200).json({
      success: true,
      message: "Membership request cancelled successfully",
    });
  },
);

// Validation rules
export const getMembersValidation = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
  query("search")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Search term must be 2-50 characters"),
  query("gender")
    .optional()
    .isIn(["male", "female", "other"])
    .withMessage("Invalid gender"),
  query("role")
    .optional()
    .isIn(["member", "admin"])
    .withMessage("Invalid role"),
  query("sort")
    .optional()
    .isIn(["name", "newest", "oldest", "active"])
    .withMessage("Invalid sort option"),
];
