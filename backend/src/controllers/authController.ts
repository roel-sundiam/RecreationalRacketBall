import { Response } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User';
import { AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { RegisterRequest, LoginRequest, AuthResponse, User as IUser } from '../types';
import { getUserClubsWithRoles } from '../middleware/club';

interface TokenPayload {
  userId: string;
  platformRole: 'user' | 'platform_admin';
  selectedClubId?: string;
  clubRoles?: { [clubId: string]: 'member' | 'admin' | 'treasurer' };
}

const generateToken = (
  userId: string,
  platformRole: 'user' | 'platform_admin',
  selectedClubId?: string,
  clubRoles?: { [clubId: string]: 'member' | 'admin' | 'treasurer' }
): string => {
  const jwtSecret = process.env.JWT_SECRET;
  const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';

  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not defined');
  }

  const payload: TokenPayload = {
    userId,
    platformRole,
    selectedClubId,
    clubRoles: clubRoles || {}
  };

  return jwt.sign(payload, jwtSecret, { expiresIn: jwtExpiresIn } as SignOptions);
};

export const register = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { username, fullName, email, password, gender, phone, dateOfBirth, isHomeowner }: RegisterRequest = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({
    $or: [{ username }, { email }]
  });

  if (existingUser) {
    res.status(400).json({
      success: false,
      error: existingUser.username === username ? 'Username already exists' : 'Email already exists'
    });
    return;
  }

  // Create new user
  const user = new User({
    username,
    fullName,
    email,
    password,
    gender,
    phone,
    dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
    isHomeowner: isHomeowner || false,
    isApproved: true // Auto-approve at platform level; club memberships require separate approval
  });

  await user.save();

  // Generate token for immediate login (even though approval is pending)
  const platformRole = user.platformRole || 'user';
  const token = generateToken(user._id.toString(), platformRole);

  const response: AuthResponse & { clubs: any[] } = {
    token,
    user: {
      ...user.toObject(),
      _id: user._id.toString(),
      deletedBy: user.deletedBy?.toString() || null
    } as Omit<IUser, 'password'>,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    clubs: [] // New users have no clubs yet
  };

  res.status(201).json({
    success: true,
    data: response,
    message: 'Registration successful! You can now login and browse clubs to request membership.'
  });
});

export const login = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { username, password }: LoginRequest = req.body;

  // Find user and include password field
  const user = await User.findOne({
    $or: [{ username }, { email: username }]
  }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    res.status(401).json({
      success: false,
      error: 'Invalid username or password'
    });
    return;
  }

  // Check approval status BEFORE active status
  // (New accounts are not approved AND not active, so check approval first)
  if (!user.isApproved) {
    res.status(403).json({
      success: false,
      error: 'Your account is pending approval. A platform administrator will review your registration shortly.'
    });
    return;
  }

  // Check if approved account is active
  if (!user.isActive) {
    res.status(403).json({
      success: false,
      error: 'Your account has been deactivated. Please contact support for assistance.'
    });
    return;
  }

  // Update last login
  user.lastLogin = new Date();
  await user.save();

  // Get user's clubs with roles
  const clubs = await getUserClubsWithRoles(user._id);

  // Build club roles map for JWT
  const clubRoles: { [clubId: string]: 'member' | 'admin' | 'treasurer' } = {};
  clubs.forEach(club => {
    if (club.status === 'approved') {
      clubRoles[club.clubId] = club.role;
    }
  });

  // Auto-select first approved club if user has clubs
  const approvedClubs = clubs.filter(c => c.status === 'approved');
  const selectedClubId = approvedClubs.length > 0 ? approvedClubs[0]?.clubId : undefined;

  // Generate token with club information
  const platformRole = user.platformRole || 'user';
  const token = generateToken(user._id.toString(), platformRole, selectedClubId, clubRoles);

  const response: AuthResponse & { clubs: any[] } = {
    token,
    user: {
      ...user.toObject(),
      _id: user._id.toString(),
      deletedBy: user.deletedBy?.toString() || null
    } as Omit<IUser, 'password'>,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    clubs // Include clubs array in response
  };

  res.status(200).json({
    success: true,
    data: response,
    message: 'Login successful'
  });
});

export const logout = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  // In a stateless JWT implementation, logout is handled client-side
  // You could implement token blacklisting here if needed
  res.status(200).json({
    success: true,
    message: 'Logout successful'
  });
});

export const getProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'User not authenticated'
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: req.user.toObject()
  });
});

export const updateProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'User not authenticated'
    });
    return;
  }

  const allowedUpdates = ['fullName', 'email', 'phone', 'dateOfBirth'];
  const updates = Object.keys(req.body);
  const isValidOperation = updates.every(update => allowedUpdates.includes(update));

  if (!isValidOperation) {
    res.status(400).json({
      success: false,
      error: 'Invalid updates'
    });
    return;
  }

  // Check if email is already taken by another user
  if (req.body.email && req.body.email !== req.user.email) {
    const existingUser = await User.findOne({ 
      email: req.body.email,
      _id: { $ne: req.user._id }
    });
    
    if (existingUser) {
      res.status(400).json({
        success: false,
        error: 'Email already exists'
      });
      return;
    }
  }

  updates.forEach(update => {
    (req.user as any)[update] = req.body[update];
  });

  if (req.body.dateOfBirth) {
    req.user.dateOfBirth = new Date(req.body.dateOfBirth);
  }

  await req.user.save();

  res.status(200).json({
    success: true,
    data: req.user.toObject(),
    message: 'Profile updated successfully'
  });
});

export const changePassword = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'User not authenticated'
    });
    return;
  }

  const { currentPassword, newPassword } = req.body;

  // Get user with password field
  const user = await User.findById(req.user._id).select('+password');
  
  if (!user || !(await user.comparePassword(currentPassword))) {
    res.status(400).json({
      success: false,
      error: 'Current password is incorrect'
    });
    return;
  }

  user.password = newPassword;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Password changed successfully'
  });
});

/**
 * Switch user's selected club
 * Generates new JWT with updated selectedClubId
 */
export const switchClub = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'User not authenticated'
    });
    return;
  }

  const { clubId } = req.body;

  if (!clubId) {
    res.status(400).json({
      success: false,
      error: 'Club ID is required'
    });
    return;
  }

  // Validate clubId format
  if (!mongoose.Types.ObjectId.isValid(clubId)) {
    res.status(400).json({
      success: false,
      error: 'Invalid club ID format'
    });
    return;
  }

  // Verify user is a member of this club
  const membership = await getUserClubsWithRoles(req.user._id);
  const club = membership.find(c => c.clubId === clubId && c.status === 'approved');

  if (!club) {
    res.status(403).json({
      success: false,
      error: 'You are not an approved member of this club'
    });
    return;
  }

  // Build club roles map for JWT
  const clubRoles: { [clubId: string]: 'member' | 'admin' | 'treasurer' } = {};
  membership.forEach(m => {
    if (m.status === 'approved') {
      clubRoles[m.clubId] = m.role;
    }
  });

  // Generate new token with updated selectedClubId
  const platformRole = req.user.platformRole || 'user';
  const token = generateToken(req.user._id.toString(), platformRole, clubId, clubRoles);

  res.status(200).json({
    success: true,
    data: {
      token,
      selectedClub: club,
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    },
    message: `Switched to ${club.clubName}`
  });
});