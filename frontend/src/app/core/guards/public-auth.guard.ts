import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from '../auth/auth.store';
import { ProfileStore } from '../profile/profile.store';

/**
 * Route guard for public auth pages (/login, /register):
 * Redirects already authenticated users to /dashboard (or /onboarding if not completed).
 */
export const publicAuthGuard: CanActivateFn = () => {
  const authStore = inject(AuthStore);
  const profileStore = inject(ProfileStore);
  const router = inject(Router);

  if (authStore.isAuthenticated()) {
    if (profileStore.hasCompletedOnboarding()) {
      return router.createUrlTree(['/dashboard']);
    }
    return router.createUrlTree(['/onboarding']);
  }

  return true;
};
