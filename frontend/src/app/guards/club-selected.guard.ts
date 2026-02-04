import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard to ensure a club is selected before accessing club-specific routes
 * Redirects to club selector if no club is selected
 */
export const clubSelectedGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const selectedClub = authService.selectedClub;

  if (!selectedClub) {
    console.warn('🚫 Club Selected Guard: No club selected, redirecting to club selector');
    console.warn('   Attempted route:', state.url);

    // Save the intended route so we can redirect back after club selection
    authService.setIntendedRoute(state.url);

    // Redirect to club selector
    router.navigate(['/club-selector'], {
      queryParams: { returnUrl: state.url }
    });

    return false;
  }

  console.log('✅ Club Selected Guard: Club is selected:', (selectedClub as any).clubName || selectedClub.club?.name || selectedClub.clubId);
  return true;
};
