import { inject, APP_INITIALIZER } from '@angular/core';
import { AuthStore } from '../auth/auth.store';
import { AuthService } from '../auth/auth.service';

/**
 * App initializer that restores auth state from sessionStorage on startup.
 *
 * If a token exists, validates it by calling GET /api/Auth/me.
 * - 200 → store the returned user, mark authenticated.
 * - 401 / error → clear stale token.
 *
 * Prevents the dashboard from flashing before auth resolution.
 */
function initializeAuth(): () => Promise<void> {
  const authStore = inject(AuthStore);
  const authService = inject(AuthService);

  return () =>
    new Promise<void>((resolve) => {
      const token = authStore.accessToken();

      if (!token) {
        authStore.markInitialized();
        resolve();
        return;
      }

      // Validate token by calling /me
      authService.getCurrentUser().subscribe({
        next: (user) => {
          authStore.setUser(user);
          authStore.markInitialized();
          resolve();
        },
        error: () => {
          authStore.clearAuth();
          authStore.markInitialized();
          resolve();
        },
      });
    });
}

export const authInitializerProvider = {
  provide: APP_INITIALIZER,
  useFactory: initializeAuth,
  multi: true,
};
