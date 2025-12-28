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

  const user = authService.currentUser;
  const role = user?.role;

  // Check if user is authenticated and has financial access role
  if (authService.isAuthenticated() && user && (role === 'treasurer' || role === 'admin' || role === 'superadmin')) {
    return true;
  }

  router.navigate(['/dashboard']);
  return false;
};