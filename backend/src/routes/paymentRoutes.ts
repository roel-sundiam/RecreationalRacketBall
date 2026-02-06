import { Router, Request, Response, NextFunction } from "express";
import {
  createPayment,
  getPayments,
  getPayment,
  processPayment,
  updatePayment,
  cancelPayment,
  getMyPayments,
  getOverduePayments,
  checkMyOverduePayments,
  getPaymentStats,
  calculatePaymentAmount,
  cleanupDuplicatePayments,
  approvePayment,
  recordPayment,
  unrecordPayment,
  payOnBehalf,
  createPaymentValidation,
  processPaymentValidation,
  payOnBehalfValidation,
  recordMembershipFeePayment,
  getMembershipPayments,
  getMembershipPaymentSummary,
  updateMembershipPayment,
  deleteMembershipPayment,
  validateMembershipFeePayment,
} from "../controllers/paymentController";
import {
  authenticateToken,
  requireRole,
  requireFinancialAccess,
  AuthenticatedRequest,
} from "../middleware/auth";
import { extractClubContext, requireClubRole } from "../middleware/club";
import { autoFixPaymentsMiddleware } from "../middleware/autoFixPayments";
import { validationResult } from "express-validator";

const router = Router();

// Validation middleware
const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log("❌ VALIDATION ERRORS:", {
      requestBody: req.body,
      errors: errors.array(),
      endpoint: req.path,
      method: req.method,
    });
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
 * @route POST /api/payments
 * @desc Create a new payment for a reservation
 * @access Private (requires club context)
 */
router.post(
  "/",
  authenticateToken,
  extractClubContext,
  createPaymentValidation,
  handleValidationErrors,
  autoFixPaymentsMiddleware,
  createPayment,
);

/**
 * @route POST /api/payments/pay-on-behalf
 * @desc Create payment on behalf of another member (reserver only)
 * @access Private (requires club context)
 */
router.post(
  "/pay-on-behalf",
  authenticateToken,
  extractClubContext,
  payOnBehalfValidation,
  handleValidationErrors,
  payOnBehalf,
);

/**
 * @route GET /api/payments
 * @desc Get all payments with filtering and pagination
 * @access Private (Club Admin/Treasurer)
 */
router.get(
  "/",
  authenticateToken,
  extractClubContext,
  requireClubRole(["admin", "treasurer"]),
  getPayments,
);

/**
 * @route GET /api/payments/my
 * @desc Get current user's payment history
 * @access Private
 */
router.get(
  "/my",
  authenticateToken,
  extractClubContext,
  (req, res, next) => {
    // Remove client cache headers to force fresh responses
    delete req.headers["if-none-match"];
    delete req.headers["if-modified-since"];

    // Set no-cache headers at route level to prevent 304 responses
    res.set({
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    });
    next();
  },
  getMyPayments,
);

/**
 * @route GET /api/payments/check-overdue
 * @desc Check current user's overdue payments
 * @access Private
 */
router.get(
  "/check-overdue",
  authenticateToken,
  extractClubContext,
  checkMyOverduePayments,
);

/**
 * @route GET /api/payments/overdue
 * @desc Get all overdue payments
 * @access Private (Club Admin)
 */
router.get(
  "/overdue",
  authenticateToken,
  extractClubContext,
  requireClubRole(["admin", "treasurer"]),
  getOverduePayments,
);

/**
 * @route GET /api/payments/stats
 * @desc Get payment statistics
 * @access Private (Club Admin/Treasurer)
 */
router.get(
  "/stats",
  authenticateToken,
  extractClubContext,
  requireClubRole(["admin", "treasurer"]),
  getPaymentStats,
);

/**
 * @route GET /api/payments/calculate
 * @desc Calculate payment amount for given parameters
 * @access Private (requires club context)
 */
router.get(
  "/calculate",
  authenticateToken,
  extractClubContext,
  calculatePaymentAmount,
);

/**
 * @route POST /api/payments/cleanup-duplicates
 * @desc Clean up duplicate payment records (admin utility)
 * @access Private (Club Admin)
 */
router.post(
  "/cleanup-duplicates",
  authenticateToken,
  extractClubContext,
  requireClubRole(["admin"]),
  cleanupDuplicatePayments,
);

// ======================
// MEMBERSHIP FEE ROUTES (Must come BEFORE /:id route)
// ======================

/**
 * @route POST /api/payments/membership-fee
 * @desc Record membership fee payment for a member
 * @access Private (Treasurer/Admin/SuperAdmin only)
 */
router.post(
  "/membership-fee",
  authenticateToken,
  extractClubContext,
  requireFinancialAccess,
  validateMembershipFeePayment,
  handleValidationErrors,
  recordMembershipFeePayment,
);

/**
 * @route GET /api/payments/membership-fees
 * @desc Get all membership fee payments with filtering
 * @access Private (Treasurer/Admin/SuperAdmin only)
 */
router.get(
  "/membership-fees",
  authenticateToken,
  extractClubContext,
  requireFinancialAccess,
  getMembershipPayments,
);

/**
 * @route GET /api/payments/membership-fees/summary
 * @desc Get membership fee payment summary by year
 * @access Private (Treasurer/Admin/SuperAdmin only)
 */
router.get(
  "/membership-fees/summary",
  authenticateToken,
  extractClubContext,
  requireFinancialAccess,
  getMembershipPaymentSummary,
);

/**
 * @route PATCH /api/payments/membership-fees/:id
 * @desc Update membership fee payment
 * @access Private (Treasurer/Admin/SuperAdmin only)
 */
router.patch(
  "/membership-fees/:id",
  authenticateToken,
  extractClubContext,
  requireFinancialAccess,
  updateMembershipPayment,
);

/**
 * @route DELETE /api/payments/membership-fees/:id
 * @desc Delete membership fee payment
 * @access Private (Treasurer/Admin/SuperAdmin only)
 */
router.delete(
  "/membership-fees/:id",
  authenticateToken,
  extractClubContext,
  requireFinancialAccess,
  deleteMembershipPayment,
);

/**
 * @route GET /api/payments/:id
 * @desc Get a specific payment
 * @access Private
 */
router.get("/:id", authenticateToken, getPayment);

/**
 * @route PUT /api/payments/:id
 * @desc Update payment details (payment method, transaction ID, etc.)
 * @access Private (payment owner or admin)
 */
router.put("/:id", authenticateToken, extractClubContext, updatePayment);

/**
 * @route PUT /api/payments/:id/process
 * @desc Process a payment (mark as completed)
 * @access Private (Admin/SuperAdmin or payment owner for certain methods)
 */
router.put(
  "/:id/process",
  authenticateToken,
  extractClubContext,
  processPaymentValidation,
  handleValidationErrors,
  async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      // Allow users to process their own payments
      if (req.user?.role === "member") {
        const Payment = require("../models/Payment").default;
        const payment = await Payment.findOne({
          _id: req.params.id,
          clubId: req.clubId,
        });

        if (!payment) {
          res.status(404).json({
            success: false,
            error: "Payment not found",
          });
          return;
        }

        // Members can process their own payments OR payments they paid for others
        const isOwnPayment =
          payment.userId.toString() === req.user._id.toString();
        const isPaidByUser =
          payment.paidBy &&
          payment.paidBy.toString() === req.user._id.toString();

        if (!isOwnPayment && !isPaidByUser) {
          res.status(403).json({
            success: false,
            error: "Access denied",
          });
          return;
        }

        // Members can process their own payments for all payment methods
        // Admin verification will happen later during the "record payment" step
      }

      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  },
  autoFixPaymentsMiddleware,
  processPayment,
);

/**
 * @route PUT /api/payments/:id/approve
 * @desc Approve a pending payment (mark as completed)
 * @access Private (Club Admin/Treasurer only)
 */
router.put(
  "/:id/approve",
  authenticateToken,
  extractClubContext,
  requireClubRole(["admin", "treasurer"]),
  autoFixPaymentsMiddleware,
  approvePayment,
);

/**
 * @route PUT /api/payments/:id/record
 * @desc Record an approved payment (mark as recorded)
 * @access Private (Club Admin/Treasurer only)
 */
router.put(
  "/:id/record",
  authenticateToken,
  extractClubContext,
  requireClubRole(["admin", "treasurer"]),
  recordPayment,
);

/**
 * @route PUT /api/payments/:id/unrecord
 * @desc Unrecord a recorded payment (reverse recording)
 * @access Private (Club Admin/Treasurer only)
 */
router.put(
  "/:id/unrecord",
  authenticateToken,
  extractClubContext,
  requireClubRole(["admin", "treasurer"]),
  unrecordPayment,
);

/**
 * @route PUT /api/payments/:id/cancel
 * @desc Cancel or refund a payment
 * @access Private (Admin/SuperAdmin or payment owner)
 */
router.put("/:id/cancel", authenticateToken, cancelPayment);

/**
 * @route GET /api/payments/debug-user-payments
 * @desc Debug route to check user payments directly
 * @access Private - TEMPORARY DEBUG ROUTE
 */
router.get("/debug-user-payments", async (req: Request, res: Response) => {
  try {
    const Payment = require("../models/Payment").default;
    const User = require("../models/User").default;

    // Find superadmin user directly
    const superadmin = await User.findOne({ username: "superadmin" });
    if (!superadmin) {
      return res.json({ success: false, error: "Superadmin user not found" });
    }

    console.log("🔧 DEBUG: User info:", {
      userId: superadmin._id.toString(),
      role: superadmin.role,
      username: superadmin.username,
    });

    // Check all payments for superadmin user
    const allPayments = await Payment.find({
      userId: superadmin._id.toString(),
    })
      .populate("reservationId", "date timeSlot players")
      .sort({ createdAt: -1 });

    console.log(
      "🔧 DEBUG: All payments found:",
      allPayments.map((p: any) => ({
        id: p._id.toString(),
        description: p.description,
        status: p.status,
        amount: p.amount,
        paymentDate: p.paymentDate,
        createdAt: p.createdAt,
        userId: p.userId?.toString(),
        reservationInfo: p.reservationId
          ? {
              date: p.reservationId.date,
              timeSlot: p.reservationId.timeSlot,
            }
          : null,
      })),
    );

    // Check specifically completed payments
    const completedPayments = await Payment.find({
      userId: superadmin._id.toString(),
      status: "completed",
    });

    console.log("🔧 DEBUG: Completed payments:", completedPayments.length);

    return res.json({
      success: true,
      data: {
        userId: superadmin._id.toString(),
        allPayments: allPayments.length,
        completedPayments: completedPayments.length,
        payments: allPayments.map((p: any) => ({
          id: p._id.toString(),
          description: p.description,
          status: p.status,
          amount: p.amount,
          paymentDate: p.paymentDate,
          createdAt: p.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error("🔧 DEBUG ERROR:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
