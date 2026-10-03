import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from '../auth/auth.store';
import { ProfileStore } from '../profile/profile.store';

/**
 * Route guard for /onboarding:
 * - Redirects unauthenticated visitors to /login.
 * - Redirects users who already completed onboarding to /dashboard.
 */
export const onboardingGuard: CanActivateFn = () => {
  const authStore = inject(AuthStore);
  const profileStore = inject(ProfileStore);
  const router = inject(Router);

  if (!authStore.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }

  if (profileStore.hasCompletedOnboarding()) {
    return router.createUrlTree(['/dashboard']);
  }

  return true;
};
