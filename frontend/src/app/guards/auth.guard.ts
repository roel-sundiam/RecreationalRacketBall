import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};

export const loginGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return true;
  }

  router.navigate(['/dashboard']);
  return false;
};

export const adminGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated() && authService.isAdmin()) {
    return true;
  }

  router.navigate(['/dashboard']);
  return false;
};

export const superadminGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated() && authService.isSuperAdmin()) {
    return true;
  }

  router.navigate(['/dashboard']);
  return false;
};

export const treasurerGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // First check authentication
  if (!authService.isAuthenticated()) {
    router.navigate(['/login']);
    return false;
  }

  // Platform admins and superadmins can access without club selection
  if (authService.isPlatformAdmin() || authService.isSuperAdmin()) {
    return true;
  }

  // For non-platform admins, require a selected club
  if (!authService.selectedClub) {
    router.navigate(['/club-selector']);
    return false;
  }

  // Check if user has financial access in selected club (admin/treasurer)
  if (authService.hasFinancialAccess()) {
    return true;
  }

  router.navigate(['/dashboard']);
  return false;
};

/**
 * Guard to ensure user has selected a club before accessing club-specific routes
 * Redirects to club-selector if no club is selected
 * Exception: Superadmins can bypass club selection requirement
 */
export const clubSelectionGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // First check if user is authenticated
  if (!authService.isAuthenticated()) {
    router.navigate(['/login']);
    return false;
  }

  // Check if user has selected a club
  if (authService.selectedClub) {
    return true;
  }

  // Allow superadmins to bypass club selection requirement
  // They can access pages even without selecting a club
  if (authService.isSuperAdmin()) {
    return true;
  }

  // Check if user has any approved clubs
  if (authService.hasApprovedClubs()) {
    // User has clubs but hasn't selected one - redirect to selector
    router.navigate(['/club-selector']);
    return false;
  }

  // User has no approved clubs - could redirect to registration or show message
  // For now, redirect to club selector which will show "no clubs" message
  router.navigate(['/club-selector']);
  return false;
};

/**
 * Guard for club admin routes - requires selected club AND admin/treasurer role in that club
 * Platform admins and superadmins can bypass club selection requirement
 */
export const clubAdminGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // First check authentication
  if (!authService.isAuthenticated()) {
    router.navigate(['/login']);
    return false;
  }

  // Platform admins and superadmins can access without club selection
  if (authService.isPlatformAdmin() || authService.isSuperAdmin()) {
    return true;
  }

  // For non-platform admins, require club selection
  if (!authService.selectedClub) {
    router.navigate(['/club-selector']);
    return false;
  }

  // Check if user is admin in selected club
  if (authService.isClubAdmin()) {
    return true;
  }

  // Not authorized - redirect to dashboard
  router.navigate(['/dashboard']);
  return false;
};