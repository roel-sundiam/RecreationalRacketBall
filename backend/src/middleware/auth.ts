import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User, { IUserDocument } from '../models/User';

export interface AuthenticatedRequest extends Request {
  user?: IUserDocument;
  userId?: string;
  // Club context (from club middleware)
  clubId?: import('mongoose').Types.ObjectId;
  clubMembership?: any;
  clubRole?: 'member' | 'admin' | 'treasurer';
  // Impersonation context
  impersonation?: {
    isImpersonating: boolean;
    adminUser?: IUserDocument;
    adminId?: string;
  };
}

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    console.log('🔐 Auth middleware - Headers:', Object.keys(req.headers));
    console.log('🔐 Auth middleware - Authorization header:', req.headers.authorization ? 'present' : 'missing');
    
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      console.log('🔐 Auth middleware - No token found');
      res.status(401).json({
        success: false,
        error: 'Access token required'
      });
      return;
    }

    console.log('🔐 Auth middleware - Token found, verifying...');

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      res.status(500).json({
        success: false,
        error: 'JWT secret not configured'
      });
      return;
    }

    const decoded = jwt.verify(token, jwtSecret) as {
      userId: string;
      platformRole?: 'user' | 'platform_admin';
      selectedClubId?: string;
      clubRoles?: { [clubId: string]: 'member' | 'admin' | 'treasurer' };
      impersonation?: {
        adminId: string;
        impersonatedUserId: string;
        startedAt: number;
      };
    };

    // Attach club context from JWT to request for use in club middleware
    (req as any).user = {
      ...decoded,
      userId: decoded.userId,
      platformRole: decoded.platformRole || 'user',
      selectedClubId: decoded.selectedClubId,
      clubRoles: decoded.clubRoles || {}
    };

    const user = await User.findById(decoded.userId).select('+password');
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Invalid token - user not found'
      });
      return;
    }

    console.log(`🔐 Auth middleware - User found: ${user.username}, isApproved: ${user.isApproved}, isActive: ${user.isActive}, role: ${user.role}`);

    if (!user.isActive) {
      console.log(`🔐 Auth middleware - BLOCKED: User ${user.username} is not active`);
      res.status(401).json({
        success: false,
        error: 'Account has been deactivated'
      });
      return;
    }

    if (!user.isApproved && user.role !== 'superadmin') {
      console.log(`🔐 Auth middleware - BLOCKED: User ${user.username} is not approved (role: ${user.role})`);
      res.status(401).json({
        success: false,
        error: 'Account pending approval'
      });
      return;
    }

    console.log(`🔐 Auth middleware - User ${user.username} passed all checks`);


    // Attach full user document to request (for backward compatibility)
    req.user = user;
    req.userId = user._id.toString();

    // Update (req as any).user with full JWT context + user info
    (req as any).user = {
      ...((req as any).user || {}),
      _id: user._id, // Add _id for controller compatibility
      userId: user._id.toString(),
      username: user.username, // Add username for debugging
      role: user.role, // Add role for backward compatibility
      platformRole: user.platformRole || decoded.platformRole || 'user',
      selectedClubId: decoded.selectedClubId,
      clubRoles: decoded.clubRoles || {},
      isApproved: user.isApproved, // CRITICAL: Include approval status
      isActive: user.isActive, // CRITICAL: Include active status
      membershipFeesPaid: user.membershipFeesPaid // Include membership fees status
    };

    // Handle impersonation context
    if (decoded.impersonation) {
      const adminUser = await User.findById(decoded.impersonation.adminId);

      if (!adminUser || !['admin', 'superadmin'].includes(adminUser.role)) {
        res.status(401).json({
          success: false,
          error: 'Invalid impersonation - admin not found or unauthorized'
        });
        return;
      }

      req.impersonation = {
        isImpersonating: true,
        adminUser,
        adminId: adminUser._id.toString()
      };

      console.log(`👥 Impersonation: ${adminUser.username} viewing as ${user.username}`);
    }

    next();
  } catch (error) {
    console.log('🔐 Auth middleware - Error occurred:', error);
    if (error instanceof jwt.JsonWebTokenError) {
      console.log('🔐 Auth middleware - JWT Error:', error.message);
      res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    } else if (error instanceof jwt.TokenExpiredError) {
      console.log('🔐 Auth middleware - Token expired:', error.message);
      res.status(401).json({
        success: false,
        error: 'Token expired'
      });
    } else {
      console.log('🔐 Auth middleware - Other error:', error);
      res.status(500).json({
        success: false,
        error: 'Authentication error'
      });
    }
  }
};

export const requireRole = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
      return;
    }

    next();
  };
};

export const requireAdmin = requireRole(['admin', 'superadmin']);
export const requireSuperAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
    return;
  }

  console.log('🔐 requireSuperAdmin - req.user.role:', req.user.role);
  console.log('🔐 requireSuperAdmin - req.user.platformRole:', (req.user as any).platformRole);
  console.log('🔐 requireSuperAdmin - Full req.user keys:', Object.keys(req.user));

  // Support both old role system (role: 'superadmin') and new multi-tenant system (platformRole: 'platform_admin')
  const isSuperAdmin = req.user.role === 'superadmin' || (req.user as any).platformRole === 'platform_admin';

  console.log('🔐 requireSuperAdmin - isSuperAdmin:', isSuperAdmin);

  if (!isSuperAdmin) {
    res.status(403).json({
      success: false,
      error: 'Insufficient permissions'
    });
    return;
  }

  next();
};
export const requireTreasurer = requireRole(['treasurer', 'admin', 'superadmin']);
export const requireFinancialAccess = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
    return;
  }

  const isPlatformAdmin = (req.user as any).platformRole === 'platform_admin';
  const isSuperAdmin = req.user.role === 'superadmin' || isPlatformAdmin;
  const hasLegacyRole = ['treasurer', 'admin', 'superadmin'].includes(req.user.role);
  const hasClubRole = req.clubRole === 'admin' || req.clubRole === 'treasurer';

  if (isSuperAdmin || hasLegacyRole || hasClubRole) {
    next();
    return;
  }

  res.status(403).json({
    success: false,
    error: 'Insufficient permissions'
  });
};

export const requireApprovedUser = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
    return;
  }

  console.log(`🔐 requireApprovedUser - Checking user: ${req.user.username}, isApproved: ${req.user.isApproved}, role: ${req.user.role}`);

  if (!req.user.isApproved && req.user.role !== 'superadmin') {
    console.log(`🔐 requireApprovedUser - BLOCKED: User ${req.user.username} is not approved (role: ${req.user.role})`);
    res.status(403).json({
      success: false,
      error: 'Account pending approval'
    });
    return;
  }

  console.log(`🔐 requireApprovedUser - User ${req.user.username} approved, continuing...`);
  next();
};

export const requireMembershipFees = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
    return;
  }

  if (!req.user.membershipFeesPaid && req.user.role === 'member') {
    res.status(403).json({
      success: false,
      error: 'Membership fees must be paid before using this feature'
    });
    return;
  }

  next();
};

export const preventImpersonationFor = (actions: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (req.impersonation?.isImpersonating) {
      res.status(403).json({
        success: false,
        error: `Action not allowed during impersonation: ${actions.join(', ')}`
      });
      return;
    }
    next();
  };
};