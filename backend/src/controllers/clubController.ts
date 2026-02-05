import { Response } from "express";
import mongoose from "mongoose";
import { AuthenticatedRequest } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import Club from "../models/Club";
import ClubSettings from "../models/ClubSettings";
import ClubMembership from "../models/ClubMembership";
import User from "../models/User";
import { uploadClubLogo } from "../config/supabase";

/**
 * PUBLIC: Register a new club
 * Creates club, settings, and makes registrant the first admin
 */
export const registerClub = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    console.log("🏢 Club Registration - req.user:", req.user);
    console.log("🏢 Club Registration - req.user._id:", req.user?._id);
    console.log(
      "🏢 Club Registration - req.user.userId:",
      (req.user as any)?.userId,
    );

    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Authentication required to register a club",
      });
      return;
    }

    const {
      name,
      slug: providedSlug,
      adminUserId, // Optional: User to be made admin (defaults to requester)
      contactEmail,
      contactPhone,
      address,
      coordinates,
      logo,
      primaryColor,
      accentColor,
    } = req.body;

    // Generate slug from name if not provided
    const slug =
      providedSlug ||
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

    // Check if slug is already taken
    const existingClub = await Club.findOne({ slug });
    if (existingClub) {
      res.status(400).json({
        success: false,
        error: "Club slug is already taken. Please choose a different name.",
      });
      return;
    }

    // Create the club
    const club = new Club({
      name,
      slug,
      contactEmail,
      contactPhone,
      address,
      coordinates,
      logo,
      primaryColor: primaryColor || "#1976d2",
      accentColor: accentColor || "#ff4081",
      status: "trial", // Start as trial
      subscriptionTier: "free",
      ownerId: req.user._id,
    });

    await club.save();

    // Create default club settings
    const settings = new ClubSettings({
      clubId: club._id,
      updatedBy: req.user._id,
    });

    await settings.save();

    // Determine who should be the club admin
    // If adminUserId is provided, validate that user exists
    let clubAdminId = req.user._id; // Default to superadmin creating the club

    if (adminUserId) {
      const adminUser = await User.findById(adminUserId);
      if (!adminUser) {
        res.status(400).json({
          success: false,
          error: "Specified admin user not found",
        });
        return;
      }
      clubAdminId = adminUser._id;
    }

    // Create club membership for the admin (auto-approved as admin)
    const membership = new ClubMembership({
      userId: clubAdminId,
      clubId: club._id,
      role: "admin",
      status: "approved",
      approvedAt: new Date(),
      creditBalance: settings.initialCreditBalance,
    });

    await membership.save();

    res.status(201).json({
      success: true,
      data: {
        club: club.toObject(),
        settings: settings.toObject(),
        membership: membership.toObject(),
      },
      message: `Club "${name}" registered successfully! You are now an admin.`,
    });
  },
);

/**
 * PUBLIC: Register club admin account + club together (unauthenticated)
 * Creates both user account and club, both pending superadmin approval
 * No authentication required - for new users registering their club
 */
export const registerClubWithAdmin = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const {
      // User fields
      username,
      email,
      password,
      fullName,
      gender,
      userContactPhone,
      // Club fields
      clubName,
      slug: providedSlug,
      sport,
      contactEmail: clubEmail,
      clubContactPhone,
      address,
      coordinates,
      logo,
      primaryColor,
      accentColor,
    } = req.body;

    // Check if username or email already exists
    const existingUser = await User.findOne({
      $or: [{ username }, { email }],
    });

    if (existingUser) {
      res.status(400).json({
        success: false,
        error:
          existingUser.username === username
            ? "Username already exists"
            : "Email already exists",
      });
      return;
    }

    // Generate slug from club name if not provided
    const slug =
      providedSlug ||
      clubName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

    // Check for duplicate club slug
    const existingClub = await Club.findOne({ slug });
    if (existingClub) {
      res.status(400).json({
        success: false,
        error: "A club with this name/slug already exists",
      });
      return;
    }

    // Create user account (pending approval)
    const user = new User({
      username,
      email,
      password, // Will be hashed by pre-save hook
      fullName,
      gender,
      contactPhone: userContactPhone || clubContactPhone,
      role: "member",
      isApproved: false, // Pending superadmin approval
      isActive: false,
      membershipFeesPaid: false,
    });

    await user.save();

    // Create club (trial status)
    const club = new Club({
      name: clubName,
      slug,
      sport,
      contactEmail: clubEmail,
      contactPhone: clubContactPhone,
      address,
      coordinates,
      logo,
      primaryColor: primaryColor || "#1976d2",
      accentColor: accentColor || "#ff4081",
      status: "trial", // Awaiting approval
      subscriptionTier: "free",
      ownerId: user._id,
    });

    await club.save();

    // Create default club settings
    const settings = new ClubSettings({
      clubId: club._id,
      updatedBy: user._id,
    });

    await settings.save();

    // Create pending club membership for user as admin
    const membership = new ClubMembership({
      userId: user._id,
      clubId: club._id,
      role: "admin",
      status: "pending", // Pending superadmin approval
      creditBalance: settings.initialCreditBalance,
    });

    await membership.save();

    res.status(201).json({
      success: true,
      data: {
        user: {
          _id: user._id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
        },
        club: club.toObject(),
        membership: membership.toObject(),
      },
      message: `Registration submitted successfully! A platform administrator will review your club and account.`,
    });
  },
);

/**
 * USER SELF-SERVICE: Request club registration
 * Any authenticated user can request to create a club
 * Club starts in 'trial' status, membership in 'pending' status
 * Requires superadmin approval before activation
 */
export const requestClubRegistration = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
      return;
    }

    const {
      name,
      slug: providedSlug,
      contactEmail,
      contactPhone,
      address,
      coordinates,
      logo,
      primaryColor,
      accentColor,
    } = req.body;

    // Generate slug from name if not provided
    const slug =
      providedSlug ||
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

    // Check for duplicate slug
    const existingClub = await Club.findOne({ slug });
    if (existingClub) {
      res.status(400).json({
        success: false,
        error: "A club with this name/slug already exists",
      });
      return;
    }

    // Create club with trial status (pending approval)
    const club = new Club({
      name,
      slug,
      contactEmail,
      contactPhone,
      address,
      coordinates,
      logo,
      primaryColor: primaryColor || "#1976d2",
      accentColor: accentColor || "#ff4081",
      status: "trial", // Awaiting approval
      subscriptionTier: "free",
      ownerId: req.user._id,
    });

    await club.save();

    // Create default club settings
    const settings = new ClubSettings({
      clubId: club._id,
      updatedBy: req.user._id,
    });

    await settings.save();

    // Create pending club membership for requesting user as admin
    const membership = new ClubMembership({
      userId: req.user._id,
      clubId: club._id,
      role: "admin", // Will be admin once approved
      status: "pending", // NOT auto-approved - needs superadmin review
      creditBalance: settings.initialCreditBalance,
    });

    await membership.save();

    res.status(201).json({
      success: true,
      data: {
        club: club.toObject(),
        settings: settings.toObject(),
        membership: membership.toObject(),
      },
      message: `Club registration submitted successfully! A platform administrator will review your request shortly.`,
    });
  },
);

/**
 * PLATFORM ADMIN: Approve or reject pending club registration
 * Updates club status and membership status
 */
export const reviewClubRegistration = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
      return;
    }

    const { clubId } = req.params;
    const { action, rejectionReason } = req.body; // action: 'approve' | 'reject'

    // Find club
    const club = await Club.findById(clubId);
    if (!club) {
      res.status(404).json({
        success: false,
        error: "Club not found",
      });
      return;
    }

    // Find pending membership for club owner
    const membership = await ClubMembership.findOne({
      clubId: club._id,
      userId: club.ownerId,
      role: "admin",
    });

    if (!membership) {
      res.status(404).json({
        success: false,
        error: "Club membership not found",
      });
      return;
    }

    if (action === "approve") {
      // Approve club and membership
      club.status = "active";
      membership.status = "approved";
      membership.approvedAt = new Date();
      membership.approvedBy = req.user._id;

      await club.save();
      await membership.save();

      // ALWAYS approve and activate the club owner's user account when approving club
      const clubOwner = await User.findById(club.ownerId);
      if (clubOwner) {
        console.log(
          `Approving user account for club owner: ${clubOwner.username}, current isApproved: ${clubOwner.isApproved}, isActive: ${clubOwner.isActive}`,
        );
        clubOwner.isApproved = true;
        clubOwner.isActive = true;
        clubOwner.membershipFeesPaid = true; // Auto-approve membership fees for club admin
        await clubOwner.save();
        console.log(
          `User account approved: ${clubOwner.username}, isApproved: ${clubOwner.isApproved}, isActive: ${clubOwner.isActive}`,
        );
      } else {
        console.error(
          `Club owner not found for club: ${club.name}, ownerId: ${club.ownerId}`,
        );
      }

      res.json({
        success: true,
        message: `Club "${club.name}" and admin account have been approved and activated!`,
        data: { club, membership, userApproved: clubOwner?.isApproved },
      });
    } else if (action === "reject") {
      // Reject club registration
      club.status = "suspended";
      membership.status = "rejected";

      await club.save();
      await membership.save();

      res.json({
        success: true,
        message: `Club "${club.name}" registration has been rejected.`,
        data: { club, membership, reason: rejectionReason },
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Invalid action. Must be "approve" or "reject"',
      });
    }
  },
);

/**
 * PUBLIC: Search clubs by name or location
 */
export const searchClubs = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { query, city, province, limit = 20 } = req.query;

    const filter: any = {
      status: "active", // Only show active clubs in search
    };

    if (query) {
      filter.$or = [
        { name: { $regex: query, $options: "i" } },
        { slug: { $regex: query, $options: "i" } },
      ];
    }

    if (city) {
      filter["address.city"] = { $regex: city, $options: "i" };
    }

    if (province) {
      filter["address.province"] = { $regex: province, $options: "i" };
    }

    const clubs = await Club.find(filter)
      .select(
        "name slug logo primaryColor accentColor address status subscriptionTier",
      )
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: clubs,
      count: clubs.length,
    });
  },
);

/**
 * PUBLIC: Get public info about a club (for join decision)
 */
export const getClubPublicInfo = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { clubId } = req.params;

    if (!clubId || !mongoose.Types.ObjectId.isValid(clubId)) {
      res.status(400).json({
        success: false,
        error: "Invalid club ID",
      });
      return;
    }

    const club = await Club.findById(clubId).select("-ownerId"); // Don't expose owner ID publicly

    if (!club) {
      res.status(404).json({
        success: false,
        error: "Club not found",
      });
      return;
    }

    const settings = await ClubSettings.findOne({ clubId: club._id }).select(
      "membershipFee features",
    );

    const memberCount = await ClubMembership.countDocuments({
      clubId: club._id,
      status: "approved",
    });

    res.status(200).json({
      success: true,
      data: {
        club: club.toObject(),
        memberCount,
        membershipFee: settings?.membershipFee,
        features: settings?.features,
      },
    });
  },
);

/**
 * PROTECTED: Get current club settings
 * Requires: extractClubContext middleware
 */
export const getClubSettings = asyncHandler(
  async (
    req: AuthenticatedRequest & { clubId?: mongoose.Types.ObjectId },
    res: Response,
  ) => {
    // For superadmins without club context, require clubId in query params
    const isSuperAdmin =
      (req as any).user?.role === "superadmin" ||
      (req as any).user?.role === "platform_admin";

    if (!req.clubId) {
      // If superadmin, check for clubId in query params
      if (isSuperAdmin && req.query.clubId) {
        const clubId = req.query.clubId as string;
        if (!mongoose.Types.ObjectId.isValid(clubId)) {
          res.status(400).json({
            success: false,
            error: "Invalid club ID format",
          });
          return;
        }
        req.clubId = new mongoose.Types.ObjectId(clubId);
      } else {
        res.status(400).json({
          success: false,
          error:
            "Club context required. Please select a club or provide clubId.",
        });
        return;
      }
    }

    const settings = await ClubSettings.findOne({ clubId: req.clubId });

    if (!settings) {
      res.status(404).json({
        success: false,
        error: "Club settings not found",
      });
      return;
    }

    // Fetch club info to include logo
    const club = await Club.findById(req.clubId).select(
      "logo primaryColor accentColor",
    );

    res.status(200).json({
      success: true,
      data: {
        ...settings.toObject(),
        logo: club?.logo || null,
        primaryColor: club?.primaryColor || null,
        accentColor: club?.accentColor || null,
      },
    });
  },
);

/**
 * PROTECTED: Update club settings (admin only)
 * Requires: extractClubContext + requireClubAdmin
 */
export const updateClubSettings = asyncHandler(
  async (
    req: AuthenticatedRequest & { clubId?: mongoose.Types.ObjectId },
    res: Response,
  ) => {
    // For superadmins without club context, require clubId in query params
    const isSuperAdmin =
      (req as any).user?.role === "superadmin" ||
      (req as any).user?.role === "platform_admin";

    if (!req.clubId) {
      // If superadmin, check for clubId in query params
      if (isSuperAdmin && req.query.clubId) {
        const clubId = req.query.clubId as string;
        if (!mongoose.Types.ObjectId.isValid(clubId)) {
          res.status(400).json({
            success: false,
            error: "Invalid club ID format",
          });
          return;
        }
        req.clubId = new mongoose.Types.ObjectId(clubId);
      } else {
        res.status(400).json({
          success: false,
          error:
            "Club context required. Please select a club or provide clubId.",
        });
        return;
      }
    }

    const settings = await ClubSettings.findOne({ clubId: req.clubId });

    if (!settings) {
      res.status(404).json({
        success: false,
        error: "Club settings not found",
      });
      return;
    }

    const allowedUpdates = [
      "operatingHours",
      "pricing",
      "membershipFee",
      "initialCreditBalance",
      "features",
    ];

    const updates = Object.keys(req.body);
    const isValidOperation = updates.every((update) =>
      allowedUpdates.includes(update),
    );

    if (!isValidOperation) {
      res.status(400).json({
        success: false,
        error: "Invalid updates. Allowed: " + allowedUpdates.join(", "),
      });
      return;
    }

    updates.forEach((update) => {
      (settings as any)[update] = req.body[update];
    });

    if (req.user?._id) {
      settings.updatedBy = req.user._id;
    }
    await settings.save();

    res.status(200).json({
      success: true,
      data: settings.toObject(),
      message: "Club settings updated successfully",
    });
  },
);

/**
 * PROTECTED: Update club branding (admin only)
 * Requires: extractClubContext + requireClubAdmin
 */
export const updateClubBranding = asyncHandler(
  async (
    req: AuthenticatedRequest & { clubId?: mongoose.Types.ObjectId },
    res: Response,
  ) => {
    if (!req.clubId) {
      res.status(400).json({
        success: false,
        error: "Club context required",
      });
      return;
    }

    const club = await Club.findById(req.clubId);

    if (!club) {
      res.status(404).json({
        success: false,
        error: "Club not found",
      });
      return;
    }

    const allowedUpdates = ["logo", "primaryColor", "accentColor"];
    const updates = Object.keys(req.body);
    const isValidOperation = updates.every((update) =>
      allowedUpdates.includes(update),
    );

    if (!isValidOperation) {
      res.status(400).json({
        success: false,
        error: "Invalid updates. Allowed: " + allowedUpdates.join(", "),
      });
      return;
    }

    updates.forEach((update) => {
      (club as any)[update] = req.body[update];
    });

    await club.save();

    res.status(200).json({
      success: true,
      data: club.toObject(),
      message: "Club branding updated successfully",
    });
  },
);

/**
 * CLUB ADMIN: Upload club logo
 */
export const uploadClubLogoEndpoint = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const clubId = req.clubId;

    if (!clubId) {
      return res.status(400).json({
        success: false,
        message: "Club context is required",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    // Upload to Supabase
    const uploadResult = await uploadClubLogo(
      clubId.toString(),
      req.file.buffer,
      req.file.originalname,
    );

    if (!uploadResult.success) {
      return res.status(500).json({
        success: false,
        message: uploadResult.error || "Failed to upload logo",
      });
    }

    // Update club with new logo URL
    const club = await Club.findByIdAndUpdate(
      clubId,
      { logo: uploadResult.publicUrl },
      { new: true },
    );

    if (!club) {
      return res.status(404).json({
        success: false,
        message: "Club not found",
      });
    }

    res.json({
      success: true,
      message: "Club logo uploaded successfully",
      data: { logo: uploadResult.publicUrl },
    });
  },
);

// ==================== PLATFORM ADMIN ROUTES ====================

/**
 * PLATFORM ADMIN: Get all clubs
 */
export const getAllClubs = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { status, subscriptionTier, limit = 50, page = 1 } = req.query;

    const filter: any = {};

    if (status) {
      filter.status = status;
    }

    if (subscriptionTier) {
      filter.subscriptionTier = subscriptionTier;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const clubs = await Club.find(filter)
      .populate("ownerId", "username fullName email")
      .limit(Number(limit))
      .skip(skip)
      .sort({ createdAt: -1 });

    const total = await Club.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: clubs,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  },
);

/**
 * PLATFORM ADMIN: Get club details
 */
export const getClubDetails = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { clubId } = req.params;

    if (!clubId || !mongoose.Types.ObjectId.isValid(clubId)) {
      res.status(400).json({
        success: false,
        error: "Invalid club ID",
      });
      return;
    }

    const club = await Club.findById(clubId).populate(
      "ownerId",
      "username fullName email",
    );

    if (!club) {
      res.status(404).json({
        success: false,
        error: "Club not found",
      });
      return;
    }

    const settings = await ClubSettings.findOne({ clubId: club._id });
    const memberCount = await ClubMembership.countDocuments({
      clubId: club._id,
      status: "approved",
    });

    res.status(200).json({
      success: true,
      data: {
        club: club.toObject(),
        settings: settings?.toObject(),
        memberCount,
      },
    });
  },
);

/**
 * PLATFORM ADMIN: Update club status (activate/suspend)
 */
export const updateClubStatus = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { clubId } = req.params;
    const { status } = req.body;

    if (!clubId || !mongoose.Types.ObjectId.isValid(clubId)) {
      res.status(400).json({
        success: false,
        error: "Invalid club ID",
      });
      return;
    }

    if (!["active", "suspended", "trial"].includes(status)) {
      res.status(400).json({
        success: false,
        error: "Invalid status. Must be: active, suspended, or trial",
      });
      return;
    }

    const club = await Club.findById(clubId);

    if (!club) {
      res.status(404).json({
        success: false,
        error: "Club not found",
      });
      return;
    }

    club.status = status;
    await club.save();

    res.status(200).json({
      success: true,
      data: club.toObject(),
      message: `Club status updated to ${status}`,
    });
  },
);

/**
 * PLATFORM ADMIN: Get club members
 */
export const getClubMembers = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { clubId } = req.params;
    const { status, role } = req.query;

    if (!clubId || !mongoose.Types.ObjectId.isValid(clubId)) {
      res.status(400).json({
        success: false,
        error: "Invalid club ID",
      });
      return;
    }

    const filter: any = { clubId };

    if (status) {
      filter.status = status;
    }

    if (role) {
      filter.role = role;
    }

    const memberships = await ClubMembership.find(filter)
      .populate("userId", "username fullName email profilePicture")
      .sort({ joinedAt: -1 });

    res.status(200).json({
      success: true,
      data: memberships,
      count: memberships.length,
    });
  },
);

/**
 * PLATFORM ADMIN: Get platform analytics
 */
export const getPlatformAnalytics = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const totalClubs = await Club.countDocuments();
    const activeClubs = await Club.countDocuments({ status: "active" });
    const suspendedClubs = await Club.countDocuments({ status: "suspended" });
    const trialClubs = await Club.countDocuments({ status: "trial" });

    const totalUsers = await User.countDocuments();
    const totalMemberships = await ClubMembership.countDocuments({
      status: "approved",
    });

    const clubsByTier = await Club.aggregate([
      {
        $group: {
          _id: "$subscriptionTier",
          count: { $sum: 1 },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        clubs: {
          total: totalClubs,
          active: activeClubs,
          suspended: suspendedClubs,
          trial: trialClubs,
          byTier: clubsByTier,
        },
        users: {
          total: totalUsers,
          totalMemberships,
        },
      },
    });
  },
);

// Get clubs user is NOT a member of
export const getAvailableClubs = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    // Get all active clubs
    const activeClubs = await Club.find({ status: "active" })
      .select(
        "name slug logo primaryColor accentColor address contactEmail contactPhone",
      )
      .sort({ name: 1 });

    // Get clubs user is already a member of
    const userMemberships = await ClubMembership.find({
      userId: req.userId,
    }).select("clubId");

    const joinedClubIds = userMemberships.map((m) => m.clubId.toString());

    // Filter out clubs user has already joined
    const availableClubs = activeClubs.filter(
      (club) => !joinedClubIds.includes(club._id.toString()),
    );

    // Populate with settings and member count
    const clubsWithDetails = await Promise.all(
      availableClubs.map(async (club: any) => {
        const [settings, memberCount] = await Promise.all([
          ClubSettings.findOne({ clubId: club._id }).select(
            "membershipFee pricing operatingHours",
          ),
          ClubMembership.countDocuments({
            clubId: club._id,
            status: "approved",
          }),
        ]);

        return {
          ...club.toObject(),
          settings,
          memberCount,
        };
      }),
    );

    return res.status(200).json({
      success: true,
      data: clubsWithDetails,
    });
  },
);

/**
 * PLATFORM ADMIN: Get complete platform overview with all clubs and their members
 * Returns all clubs with full member lists including admins
 */
export const getPlatformOverview = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    // Get all clubs
    const clubs = await Club.find({})
      .select("name slug status logo primaryColor accentColor address")
      .sort({ name: 1 });

    // Get all club memberships with user details
    const clubsWithMembers = await Promise.all(
      clubs.map(async (club: any) => {
        const memberships = await ClubMembership.find({ clubId: club._id })
          .populate("userId", "username fullName email")
          .sort({ role: 1, "userId.fullName": 1 });

        // Filter out memberships with null/deleted users
        const validMemberships = memberships.filter((m) => m.userId != null);

        const memberCount = validMemberships.filter(
          (m) => m.status === "approved",
        ).length;
        const adminCount = validMemberships.filter(
          (m) =>
            (m.role === "admin" || m.role === "treasurer") &&
            m.status === "approved",
        ).length;
        const activeMembers = validMemberships.filter(
          (m) => m.status === "approved",
        ).length;

        return {
          _id: club._id,
          name: club.name,
          slug: club.slug,
          status: club.status,
          logo: club.logo,
          primaryColor: club.primaryColor,
          accentColor: club.accentColor,
          address: club.address,
          members: validMemberships,
          memberCount,
          adminCount,
          activeMembers,
        };
      }),
    );

    return res.status(200).json({
      success: true,
      data: clubsWithMembers,
    });
  },
);
