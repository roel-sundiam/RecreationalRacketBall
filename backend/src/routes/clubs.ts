import express from "express";
import { body } from "express-validator";
import multer from "multer";
import path from "path";
import {
  registerClub,
  registerClubWithAdmin,
  requestClubRegistration,
  reviewClubRegistration,
  searchClubs,
  getClubPublicInfo,
  getClubSettings,
  updateClubSettings,
  updateClubBranding,
  uploadClubLogoEndpoint,
  getAllClubs,
  getClubDetails,
  updateClubStatus,
  getClubMembers,
  getPlatformAnalytics,
  getAvailableClubs,
  getPlatformOverview,
} from "../controllers/clubController";
import { authenticateToken, requireSuperAdmin } from "../middleware/auth";
import { extractClubContext, requireClubAdmin } from "../middleware/club";
import { validateRequest } from "../middleware/validation";

const router = express.Router();

// Configure multer for logo uploads (memory storage for Supabase)
const logoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|gif|webp/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase(),
    );

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Only image files are allowed!"));
  },
});

// Configure multer for club registration (disk storage)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/logos/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "club-logo-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|gif|webp/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase(),
    );

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Only image files are allowed!"));
  },
});

// ==================== PUBLIC ROUTES ====================

/**
 * POST /api/clubs/register-with-admin
 * Public registration: Create both user account and club (no auth required)
 * For new users who want to register their club
 */
const registerClubWithAdminValidation = [
  // User validation
  body("username")
    .isLength({ min: 3 })
    .withMessage("Username must be at least 3 characters")
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage("Username can only contain letters, numbers, and underscores"),
  body("email")
    .isEmail()
    .withMessage("Please enter a valid email")
    .normalizeEmail(),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
  body("fullName")
    .isLength({ min: 2 })
    .withMessage("Full name must be at least 2 characters"),
  body("gender")
    .isIn(["male", "female", "other"])
    .withMessage("Gender must be male, female, or other"),
  body("userContactPhone")
    .optional()
    .matches(/^[\+]?[\d\s\-\(\)]+$/)
    .withMessage("Please enter a valid phone number"),
  // Club validation
  body("clubName")
    .isLength({ min: 3, max: 100 })
    .withMessage("Club name must be between 3 and 100 characters")
    .trim(),
  body("slug")
    .optional()
    .isLength({ min: 3, max: 50 })
    .withMessage("Slug must be between 3 and 50 characters")
    .matches(/^[a-z0-9-]+$/)
    .withMessage(
      "Slug can only contain lowercase letters, numbers, and hyphens",
    ),
  body("sport")
    .isIn([
      "Tennis",
      "Badminton",
      "Squash",
      "Racquetball",
      "Table Tennis",
      "Pickleball",
    ])
    .withMessage(
      "Sport must be one of: Tennis, Badminton, Squash, Racquetball, Table Tennis, Pickleball",
    ),
  body("contactEmail")
    .isEmail()
    .withMessage("Please enter a valid club email")
    .normalizeEmail(),
  body("clubContactPhone")
    .matches(/^[\+]?[\d\s\-\(\)]+$/)
    .withMessage("Please enter a valid club phone number"),
  body("address.street").notEmpty().withMessage("Street address is required"),
  body("address.city").notEmpty().withMessage("City is required"),
  body("address.province").notEmpty().withMessage("Province is required"),
  body("address.postalCode").notEmpty().withMessage("Postal code is required"),
  body("address.country").optional().isString(),
  body("coordinates.latitude")
    .isFloat({ min: -90, max: 90 })
    .withMessage("Latitude must be between -90 and 90"),
  body("coordinates.longitude")
    .isFloat({ min: -180, max: 180 })
    .withMessage("Longitude must be between -180 and 180"),
  body("primaryColor")
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage("Primary color must be a valid hex color"),
  body("accentColor")
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage("Accent color must be a valid hex color"),
];

router.post(
  "/register-with-admin",
  registerClubWithAdminValidation,
  validateRequest,
  registerClubWithAdmin,
);

/**
 * POST /api/clubs/register
 * Register a new club (requires authentication)
 */
const registerClubValidation = [
  body("name")
    .isLength({ min: 3, max: 100 })
    .withMessage("Club name must be between 3 and 100 characters")
    .trim(),
  body("slug")
    .optional()
    .isLength({ min: 3, max: 50 })
    .withMessage("Slug must be between 3 and 50 characters")
    .matches(/^[a-z0-9-]+$/)
    .withMessage(
      "Slug can only contain lowercase letters, numbers, and hyphens",
    ),
  body("sport")
    .isIn([
      "Tennis",
      "Badminton",
      "Squash",
      "Racquetball",
      "Table Tennis",
      "Pickleball",
    ])
    .withMessage(
      "Sport must be one of: Tennis, Badminton, Squash, Racquetball, Table Tennis, Pickleball",
    ),
  body("adminUserId")
    .optional()
    .isMongoId()
    .withMessage("Admin User ID must be a valid MongoDB ID"),
  body("contactEmail")
    .isEmail()
    .withMessage("Please enter a valid email")
    .normalizeEmail(),
  body("contactPhone")
    .matches(/^[\+]?[\d\s\-\(\)]+$/)
    .withMessage("Please enter a valid phone number"),
  body("address.street").notEmpty().withMessage("Street address is required"),
  body("address.city").notEmpty().withMessage("City is required"),
  body("address.province").notEmpty().withMessage("Province is required"),
  body("address.postalCode").notEmpty().withMessage("Postal code is required"),
  body("address.country").optional().isString(),
  body("coordinates.latitude")
    .isFloat({ min: -90, max: 90 })
    .withMessage("Latitude must be between -90 and 90"),
  body("coordinates.longitude")
    .isFloat({ min: -180, max: 180 })
    .withMessage("Longitude must be between -180 and 180"),
  body("primaryColor")
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage("Primary color must be a valid hex color"),
  body("accentColor")
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage("Accent color must be a valid hex color"),
];

router.post(
  "/register",
  authenticateToken,
  requireSuperAdmin, // Only superadmin can create clubs
  registerClubValidation,
  validateRequest,
  registerClub,
);

/**
 * POST /api/clubs/request
 * User self-service club registration (any authenticated user)
 */
router.post(
  "/request",
  authenticateToken, // Only requires authentication, NOT superadmin
  registerClubValidation, // Reuse existing validation
  validateRequest,
  requestClubRegistration,
);

/**
 * GET /api/clubs/search
 * Search for clubs (public, no auth required)
 */
router.get("/search", searchClubs);

/**
 * GET /api/clubs/:clubId/public
 * Get public info about a club
 */
router.get("/:clubId/public", getClubPublicInfo);

// ==================== PROTECTED ROUTES ====================

/**
 * @route GET /api/clubs/available
 * @desc Get clubs user is not a member of
 * @access Private (Authenticated users)
 */
router.get("/available", authenticateToken, getAvailableClubs);

// ==================== CLUB MEMBER ROUTES ====================

/**
 * GET /api/club/settings
 * Get current club's settings (requires club context)
 */
router.get(
  "/current/settings",
  authenticateToken,
  extractClubContext,
  getClubSettings,
);

/**
 * PATCH /api/club/settings
 * Update club settings (admin only)
 */
const updateSettingsValidation = [
  body("operatingHours.start")
    .optional()
    .isInt({ min: 0, max: 23 })
    .withMessage("Start hour must be between 0 and 23"),
  body("operatingHours.end")
    .optional()
    .isInt({ min: 0, max: 23 })
    .withMessage("End hour must be between 0 and 23"),
  body("pricing.pricingModel")
    .optional()
    .isIn(["variable", "fixed-hourly", "fixed-daily"])
    .withMessage(
      "Pricing model must be variable, fixed-hourly, or fixed-daily",
    ),
  body("pricing.peakHourFee")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Peak hour fee must be a positive number"),
  body("pricing.offPeakHourFee")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Off-peak hour fee must be a positive number"),
  body("pricing.fixedHourlyFee")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Fixed hourly fee must be a positive number"),
  body("pricing.fixedDailyFee")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Fixed daily fee must be a positive number"),
  body("pricing.guestFee")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Guest fee must be a positive number"),
  body("pricing.peakHours")
    .optional()
    .isArray()
    .withMessage("Peak hours must be an array"),
  body("pricing.peakHours.*")
    .optional()
    .isInt({ min: 0, max: 23 })
    .withMessage("Peak hours must be between 0 and 23"),
  body("membershipFee.annual")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Annual membership fee must be a positive number"),
  body("membershipFee.currency")
    .optional()
    .isLength({ min: 3, max: 3 })
    .withMessage("Currency must be a 3-letter code")
    .isString()
    .withMessage("Currency must be a string"),
];

router.patch(
  "/current/settings",
  authenticateToken,
  extractClubContext,
  requireClubAdmin,
  updateSettingsValidation,
  validateRequest,
  updateClubSettings,
);

/**
 * PATCH /api/club/branding
 * Update club branding (admin only)
 */
const updateBrandingValidation = [
  body("logo").optional().isURL().withMessage("Logo must be a valid URL"),
  body("primaryColor")
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage("Primary color must be a valid hex color"),
  body("accentColor")
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage("Accent color must be a valid hex color"),
];

router.patch(
  "/current/branding",
  authenticateToken,
  extractClubContext,
  requireClubAdmin,
  updateBrandingValidation,
  validateRequest,
  updateClubBranding,
);

/**
 * POST /api/clubs/:clubId/logo
 * Upload club logo to Supabase
 */
router.post(
  "/:clubId/logo",
  authenticateToken,
  extractClubContext,
  requireClubAdmin,
  logoUpload.single("logo"),
  uploadClubLogoEndpoint,
);

// ==================== PLATFORM ADMIN ROUTES ====================

/**
 * GET /api/clubs/platform/all
 * Get all clubs (platform admin only)
 */
router.get("/platform/all", authenticateToken, requireSuperAdmin, getAllClubs);

/**
 * GET /api/clubs/platform/analytics
 * Get platform-wide analytics (platform admin only)
 */
router.get(
  "/platform/analytics",
  authenticateToken,
  requireSuperAdmin,
  getPlatformAnalytics,
);

/**
 * GET /api/clubs/platform/overview
 * Get complete platform overview with all clubs and members (platform admin only)
 */
router.get(
  "/platform/overview",
  authenticateToken,
  requireSuperAdmin,
  getPlatformOverview,
);

/**
 * GET /api/clubs/platform/pending
 * Get all clubs pending approval (status: 'trial')
 */
router.get(
  "/platform/pending",
  authenticateToken,
  requireSuperAdmin,
  async (req: any, res: any) => {
    try {
      const Club = (await import("../models/Club")).default;

      const pendingClubs = await Club.find({ status: "trial" })
        .populate("ownerId", "username fullName email contactPhone")
        .sort({ createdAt: -1 });

      res.json({
        success: true,
        data: pendingClubs,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },
);

/**
 * POST /api/clubs/platform/:clubId/review
 * Approve or reject pending club registration
 */
router.post(
  "/platform/:clubId/review",
  authenticateToken,
  requireSuperAdmin,
  body("action")
    .isIn(["approve", "reject"])
    .withMessage("Action must be approve or reject"),
  body("rejectionReason").optional().isString(),
  validateRequest,
  reviewClubRegistration,
);

/**
 * GET /api/clubs/platform/:clubId
 * Get detailed club info (platform admin only)
 */
router.get(
  "/platform/:clubId",
  authenticateToken,
  requireSuperAdmin,
  getClubDetails,
);

/**
 * PATCH /api/clubs/platform/:clubId/status
 * Update club status (platform admin only)
 */
router.patch(
  "/platform/:clubId/status",
  authenticateToken,
  requireSuperAdmin,
  body("status")
    .isIn(["active", "suspended", "trial"])
    .withMessage("Status must be active, suspended, or trial"),
  validateRequest,
  updateClubStatus,
);

/**
 * GET /api/clubs/platform/:clubId/members
 * Get club members (platform admin only)
 */
router.get(
  "/platform/:clubId/members",
  authenticateToken,
  requireSuperAdmin,
  getClubMembers,
);

/**
 * POST /api/clubs/platform/:clubId/add-admin
 * Add or update admin for a club (platform admin only)
 */
router.post(
  "/platform/:clubId/add-admin",
  authenticateToken,
  requireSuperAdmin,
  body("userId").isMongoId().withMessage("User ID must be a valid MongoDB ID"),
  body("role")
    .optional()
    .isIn(["admin", "treasurer"])
    .withMessage("Role must be admin or treasurer"),
  validateRequest,
  async (req: any, res: any) => {
    const { clubId } = req.params;
    const { userId, role = "admin" } = req.body;

    try {
      const ClubMembership = (await import("../models/ClubMembership")).default;
      const User = (await import("../models/User")).default;
      const Club = (await import("../models/Club")).default;
      const ClubSettings = (await import("../models/ClubSettings")).default;

      // Verify club exists
      const club = await Club.findById(clubId);
      if (!club) {
        return res.status(404).json({
          success: false,
          error: "Club not found",
        });
      }

      // Verify user exists
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: "User not found",
        });
      }

      // Get club settings for initial credit balance
      const settings = await ClubSettings.findOne({ clubId });
      const initialCredit = settings?.initialCreditBalance || 0;

      // Check if membership already exists
      let membership = await ClubMembership.findOne({ userId, clubId });

      if (membership) {
        // Update existing membership
        membership.role = role;
        membership.status = "approved";
        membership.approvedAt = new Date();
        await membership.save();

        return res.json({
          success: true,
          message: `User role updated to ${role}`,
          data: membership,
        });
      } else {
        // Create new membership
        membership = new ClubMembership({
          userId,
          clubId,
          role,
          status: "approved",
          approvedAt: new Date(),
          creditBalance: initialCredit,
        });

        await membership.save();

        return res.status(201).json({
          success: true,
          message: `User added as ${role}`,
          data: membership,
        });
      }
    } catch (error: any) {
      console.error("Error adding club admin:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to add club admin",
      });
    }
  },
);

/**
 * POST /api/clubs/platform/:clubId/create-admin
 * Create a new user and assign as club admin (platform admin only)
 */
router.post(
  "/platform/:clubId/create-admin",
  authenticateToken,
  requireSuperAdmin,
  body("username")
    .isLength({ min: 3 })
    .withMessage("Username must be at least 3 characters")
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage("Username can only contain letters, numbers, and underscores"),
  body("email").isEmail().withMessage("Please enter a valid email"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
  body("fullName")
    .isLength({ min: 2 })
    .withMessage("Full name must be at least 2 characters"),
  body("gender")
    .isIn(["male", "female", "other"])
    .withMessage("Gender must be male, female, or other"),
  body("role")
    .optional()
    .isIn(["admin", "treasurer"])
    .withMessage("Role must be admin or treasurer"),
  validateRequest,
  async (req: any, res: any) => {
    const { clubId } = req.params;
    let { username, email, password, fullName, gender, role } = req.body;

    console.log("🔍 Create-admin received role:", role, "type:", typeof role);

    // Ensure role is set to admin or treasurer, default to admin if not provided or invalid
    if (!role || !["admin", "treasurer"].includes(role)) {
      console.log("⚠️  Role invalid or missing, setting to admin");
      role = "admin";
    }

    console.log("✅ Final role to be used:", role);

    try {
      const ClubMembership = (await import("../models/ClubMembership")).default;
      const User = (await import("../models/User")).default;
      const Club = (await import("../models/Club")).default;
      const ClubSettings = (await import("../models/ClubSettings")).default;

      // Verify club exists
      const club = await Club.findById(clubId);
      if (!club) {
        return res.status(404).json({
          success: false,
          error: "Club not found",
        });
      }

      // Check if username or email already exists
      const existingUser = await User.findOne({
        $or: [{ username }, { email }],
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          error:
            existingUser.username === username
              ? "Username already exists"
              : "Email already exists",
        });
      }

      // Create new user (password will be hashed by User model's pre-save hook)
      const newUser = new User({
        username,
        email,
        password, // Plain password - will be hashed by pre-save hook
        fullName,
        gender,
        role: "member", // Default user role
        isApproved: true, // Auto-approve
        isActive: true,
        membershipFeesPaid: true, // Auto-mark as paid
      });

      await newUser.save();

      // Get club settings for initial credit balance
      const settings = await ClubSettings.findOne({ clubId });
      const initialCredit = settings?.initialCreditBalance || 0;

      console.log("📋 Creating ClubMembership with role:", role);

      // Create club membership with admin role
      const membership = new ClubMembership({
        userId: newUser._id,
        clubId,
        role,
        status: "approved",
        approvedAt: new Date(),
        creditBalance: initialCredit,
      });

      console.log("📋 ClubMembership created, role field:", membership.role);

      await membership.save();

      console.log("💾 ClubMembership saved, final role:", membership.role);

      return res.status(201).json({
        success: true,
        message: `User created and assigned as ${role}`,
        data: {
          user: {
            _id: newUser._id,
            username: newUser.username,
            email: newUser.email,
            fullName: newUser.fullName,
          },
          membership,
        },
      });
    } catch (error: any) {
      console.error("Error creating club admin:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to create club admin",
      });
    }
  },
);

export default router;
