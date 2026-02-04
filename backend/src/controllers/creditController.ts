import { Request, Response } from 'express';
import mongoose from 'mongoose';
import User from '../models/User';
import ClubMembership from '../models/ClubMembership';
import CreditTransaction from '../models/CreditTransaction';
import { AuthenticatedRequest } from '../middleware/auth';
import {
  DepositCreditsRequest,
  AdjustCreditsRequest,
  RefundRequest,
  CreditBalance,
  CreditStats
} from '../types';

// Get current user's credit balance
export const getCreditBalance = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!._id;
    const clubId = req.clubId;

    const membership = await ClubMembership.findOne({ userId, clubId }).select('creditBalance updatedAt');
    if (!membership) {
      return res.status(404).json({
        success: false,
        error: 'Club membership not found'
      });
    }

    const pendingTransactions = await CreditTransaction.countDocuments({
      userId,
      clubId,
      status: 'pending'
    });

    const balance: CreditBalance = {
      balance: membership.creditBalance || 0,
      pendingTransactions,
      lastUpdated: membership.updatedAt
    };

    res.json({
      success: true,
      data: balance
    });
  } catch (error: any) {
    console.error('Error getting credit balance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get credit balance'
    });
  }
};

// Get current user's credit transaction history
export const getCreditTransactions = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!._id;
    const clubId = req.clubId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const type = req.query.type as string;

    const filter: any = { userId, clubId };
    if (type) {
      filter.type = type;
    }

    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      CreditTransaction.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('metadata.adminUserId', 'username fullName'),
      CreditTransaction.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error: any) {
    console.error('Error getting credit transactions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get credit transactions'
    });
  }
};

// Deposit credits (user top-up)
export const depositCredits = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!._id;
    const { amount, paymentMethod, paymentReference, description }: DepositCreditsRequest = req.body;

    // Create pending transaction (will be completed when admin confirms payment)
    const transaction = await CreditTransaction.createTransaction(
      userId.toString(),
      'deposit',
      amount,
      description || `Credit deposit via ${paymentMethod}`,
      {
        referenceType: 'deposit',
        metadata: {
          paymentMethod,
          source: 'user_deposit',
          ...(paymentReference && { paymentReference })
        },
        status: 'pending' // Requires admin confirmation
      }
    );

    res.status(201).json({
      success: true,
      data: transaction,
      message: `Credit deposit request submitted. Please provide payment confirmation to admin. Reference: ${transaction._id}`
    });
  } catch (error: any) {
    console.error('Error depositing credits:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to deposit credits'
    });
  }
};

// Get credit statistics for current user
export const getCreditStats = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!._id;
    const clubId = req.clubId;

    const membership = await ClubMembership.findOne({ userId, clubId }).select('creditBalance');
    if (!membership) {
      return res.status(404).json({
        success: false,
        error: 'Club membership not found'
      });
    }

    // Get transaction statistics
    const stats = await CreditTransaction.aggregate([
      { $match: { userId, clubId } },
      {
        $group: {
          _id: null,
          totalDeposits: {
            $sum: {
              $cond: [
                { $eq: ['$type', 'deposit'] },
                '$amount',
                0
              ]
            }
          },
          totalUsed: {
            $sum: {
              $cond: [
                { $eq: ['$type', 'deduction'] },
                '$amount',
                0
              ]
            }
          },
          totalRefunds: {
            $sum: {
              $cond: [
                { $eq: ['$type', 'refund'] },
                '$amount',
                0
              ]
            }
          },
          transactionCount: { $sum: 1 }
        }
      }
    ]);

    const creditStats: CreditStats = {
      totalDeposits: stats[0]?.totalDeposits || 0,
      totalUsed: stats[0]?.totalUsed || 0,
      totalRefunds: stats[0]?.totalRefunds || 0,
      currentBalance: membership.creditBalance || 0,
      transactionCount: stats[0]?.transactionCount || 0
    };

    res.json({
      success: true,
      data: creditStats
    });
  } catch (error: any) {
    console.error('Error getting credit stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get credit statistics'
    });
  }
};

// Admin: Adjust user credits
export const adjustCredits = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const adminId = req.user!._id;
    const clubId = req.clubId;
    const { userId, amount, type, reason }: AdjustCreditsRequest = req.body;

    // Verify target user's membership in this club
    const membership = await ClubMembership.findOne({ userId, clubId }).populate('userId', 'fullName');
    if (!membership) {
      return res.status(404).json({
        success: false,
        error: 'User membership not found in this club'
      });
    }

    const transactionType = type === 'deposit' ? 'deposit' : 'adjustment';
    const description = `Admin ${type}: ${reason}`;

    const transaction = await CreditTransaction.createTransaction(
      userId,
      transactionType,
      amount,
      description,
      {
        clubId,
        referenceType: 'admin_adjustment',
        metadata: {
          adminUserId: adminId,
          reason,
          source: 'admin_adjustment'
        }
      }
    );

    const targetUser = membership.userId as any;
    res.json({
      success: true,
      data: transaction,
      message: `Successfully ${type === 'deposit' ? 'added' : 'deducted'} ₱${amount} ${type === 'deposit' ? 'to' : 'from'} ${targetUser.fullName}'s account`
    });
  } catch (error: any) {
    console.error('Error adjusting credits:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to adjust credits'
    });
  }
};

// Admin: Get all users' credit balances
export const getAllUserCredits = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const clubId = req.clubId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;

    const skip = (page - 1) * limit;

    let filter: any = { clubId, status: 'approved' };

    // Query memberships with populated user data
    let query = ClubMembership.find(filter)
      .populate('userId', 'username fullName email isActive')
      .select('userId creditBalance role status updatedAt')
      .sort({ creditBalance: -1 })
      .skip(skip)
      .limit(limit);

    // Apply search filter if provided
    if (search) {
      const searchedUsers = await User.find({
        $or: [
          { fullName: { $regex: search, $options: 'i' } },
          { username: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      }).select('_id');
      const userIds = searchedUsers.map(u => u._id);
      filter.userId = { $in: userIds };
    }

    const [memberships, total] = await Promise.all([
      query.exec(),
      ClubMembership.countDocuments(filter)
    ]);

    // Get recent transactions for each user
    const userIds = memberships.map(m => m.userId);
    const recentTransactions = await CreditTransaction.aggregate([
      { $match: { clubId, userId: { $in: userIds } } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$userId',
          lastTransaction: { $first: '$$ROOT' }
        }
      }
    ]);

    // Map transactions to memberships
    const transactionMap = recentTransactions.reduce((acc, item) => {
      acc[item._id] = item.lastTransaction;
      return acc;
    }, {});

    const membershipsWithTransactions = memberships.map(membership => {
      const user = membership.userId as any;
      return {
        userId: user._id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        creditBalance: membership.creditBalance,
        clubRole: membership.role,
        clubStatus: membership.status,
        lastTransaction: transactionMap[user._id.toString()]
      };
    });

    res.json({
      success: true,
      data: {
        users: membershipsWithTransactions,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error: any) {
    console.error('Error getting all user credits:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user credit balances'
    });
  }
};

// Admin: Get all credit deposits
export const getAllCreditDeposits = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    const skip = (page - 1) * limit;
    
    // Build filter for credit deposits (include both user deposits and admin adjustments)
    let filter: any = { 
      type: 'deposit',
      $or: [
        { referenceType: 'deposit' },          // User-initiated deposits
        { referenceType: 'admin_adjustment' }   // Admin credit additions
      ]
    };

    if (status) {
      filter.status = status;
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = endOfDay;
      }
    }

    const [transactions, total] = await Promise.all([
      CreditTransaction.find(filter)
        .populate('userId', 'username fullName email')
        .populate('metadata.adminUserId', 'username fullName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      CreditTransaction.countDocuments(filter)
    ]);

    // Get summary statistics
    const summary = await CreditTransaction.aggregate([
      { $match: { type: 'deposit', referenceType: 'deposit' } },
      {
        $group: {
          _id: null,
          totalDeposits: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          pendingDeposits: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          completedDeposits: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          recordedDeposits: {
            $sum: { $cond: [{ $eq: ['$status', 'recorded'] }, 1, 0] }
          },
          pendingAmount: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, '$amount', 0] }
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        transactions,
        summary: summary[0] || {
          totalDeposits: 0,
          totalAmount: 0,
          pendingDeposits: 0,
          completedDeposits: 0,
          recordedDeposits: 0,
          pendingAmount: 0
        },
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error: any) {
    console.error('Error getting credit deposits:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get credit deposits'
    });
  }
};

// Admin: Mark credit deposit as recorded
export const recordCreditDeposit = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { transactionId } = req.params;
    const adminId = req.user!._id;

    // Update transaction status to recorded and update user balance
    const session = await mongoose.startSession();
    
    let updatedTransaction;
    try {
      await session.withTransaction(async () => {
        // Fetch transaction within session
        const transaction = await CreditTransaction.findById(transactionId).session(session);
        if (!transaction) {
          throw new Error('Credit deposit transaction not found');
        }

        if (transaction.type !== 'deposit' || transaction.referenceType !== 'deposit') {
          throw new Error('Transaction is not a credit deposit');
        }

        if (transaction.status === 'recorded') {
          throw new Error('Transaction is already recorded');
        }

        // Verify transaction belongs to current club
        if (transaction.clubId?.toString() !== req.clubId?.toString()) {
          throw new Error('Transaction not found in this club');
        }

        // Update club membership's credit balance (add the deposited amount)
        const membership = await ClubMembership.findOne({
          userId: transaction.userId,
          clubId: transaction.clubId
        }).session(session);
        if (!membership) {
          throw new Error('Club membership not found');
        }

        const currentBalance = membership.creditBalance || 0;
        const newBalance = currentBalance + transaction.amount;

        // Update transaction status and balance fields
        transaction.status = 'recorded';
        transaction.processedAt = new Date();
        transaction.balanceBefore = currentBalance;
        transaction.balanceAfter = newBalance;
        transaction.metadata = {
          ...transaction.metadata,
          recordedBy: adminId.toString(),
          recordedAt: new Date()
        };

        // Save both membership and transaction
        membership.creditBalance = newBalance;
        await Promise.all([
          membership.save({ session }),
          transaction.save({ session })
        ]);

        // Get user info for logging
        const user = await User.findById(transaction.userId);
        console.log(`💳 Credit deposit recorded: ${user?.fullName} balance updated from ₱${currentBalance} to ₱${newBalance}`);
        updatedTransaction = transaction;
      });
    } catch (error: any) {
      await session.endSession();
      return res.status(400).json({
        success: false,
        error: error.message
      });
    } finally {
      await session.endSession();
    }

    // Populate user info for response
    await updatedTransaction!.populate('userId', 'username fullName email');

    res.json({
      success: true,
      data: updatedTransaction,
      message: 'Credit deposit marked as recorded successfully'
    });
  } catch (error: any) {
    console.error('Error recording credit deposit:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to record credit deposit'
    });
  }
};

// Admin: Manual refund
export const refundCredits = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const adminId = req.user!._id;
    const { reservationId, pollId, amount, reason }: RefundRequest = req.body;

    let transaction;
    let targetUserId;

    if (reservationId) {
      // Refund for reservation
      const Reservation = mongoose.model('Reservation');
      const reservation = await Reservation.findById(reservationId);
      if (!reservation) {
        return res.status(404).json({
          success: false,
          error: 'Reservation not found'
        });
      }
      targetUserId = reservation.userId;
      
      transaction = await CreditTransaction.refundReservation(
        targetUserId,
        reservationId,
        amount,
        'admin_refund'
      );
    } else if (pollId) {
      // Refund for open play
      const Poll = mongoose.model('Poll');
      const poll = await Poll.findById(pollId);
      if (!poll) {
        return res.status(404).json({
          success: false,
          error: 'Poll/Open play event not found'
        });
      }
      
      // For open play, need to specify which user to refund
      // This would need additional logic to handle multiple participants
      return res.status(400).json({
        success: false,
        error: 'Open play refunds require specific user selection. Use adjust credits instead.'
      });
    } else {
      return res.status(400).json({
        success: false,
        error: 'Either reservationId or pollId must be provided'
      });
    }

    // Update transaction metadata to include admin info
    transaction.metadata = {
      ...transaction.metadata,
      adminUserId: adminId.toString(),
      reason
    };
    await transaction.save();

    res.json({
      success: true,
      data: transaction,
      message: `Successfully refunded ₱${amount} for ${reservationId ? 'reservation' : 'open play'}`
    });
  } catch (error: any) {
    console.error('Error refunding credits:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to refund credits'
    });
  }
};