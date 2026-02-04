import express, { Response } from "express";
import ClubSettings from "../models/ClubSettings";
import { AuthenticatedRequest, authenticateToken } from "../middleware/auth";
import { extractClubContext } from "../middleware/club";
import { asyncHandler } from "../middleware/errorHandler";

const router = express.Router();

// Apply auth and club context
router.use(authenticateToken);
router.use(extractClubContext);

/**
 * GET /api/club-settings
 * Get club settings (pricing, hours, etc.)
 * No auth required - settings are public for display
 */
router.get(
  "/",
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const settings = await ClubSettings.findOne({
        clubId: req.clubId,
      }).exec();

      if (!settings) {
        return res.status(404).json({
          success: false,
          error: "Club settings not found",
        });
      }

      res.json({
        success: true,
        data: settings,
      });
    } catch (error) {
      console.error("Error fetching club settings:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch club settings",
      });
    }
  }),
);

export default router;
