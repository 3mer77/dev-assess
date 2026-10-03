import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from '../auth/auth.store';
import { ProfileStore } from '../profile/profile.store';

/**
 * Route guard for dashboard and protected feature pages.
 * - Redirects unauthenticated visitors to /login.
 * - Redirects users with incomplete onboarding to /onboarding.
 */
export const authGuard: CanActivateFn = () => {
  const authStore = inject(AuthStore);
  const profileStore = inject(ProfileStore);
  const router = inject(Router);

  if (!authStore.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }

  if (!profileStore.hasCompletedOnboarding()) {
    return router.createUrlTree(['/onboarding']);
  }

  return true;
};
