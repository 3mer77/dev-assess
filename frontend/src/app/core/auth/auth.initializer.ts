import { inject, APP_INITIALIZER } from '@angular/core';
import { AuthStore } from '../auth/auth.store';
import { AuthService } from '../auth/auth.service';
import { ProfileService } from '../profile/profile.service';
import { ProfileStore } from '../profile/profile.store';

/**
 * App initializer that restores auth state and learning profile on startup.
 */
function initializeAuth(): () => Promise<void> {
  const authStore = inject(AuthStore);
  const authService = inject(AuthService);
  const profileService = inject(ProfileService);
  const profileStore = inject(ProfileStore);

  return () =>
    new Promise<void>((resolve) => {
      const token = authStore.accessToken();

      const loadProfileAndFinish = () => {
        profileService.getProfile().subscribe({
          next: (profile) => {
            profileStore.setProfile(profile);
            authStore.markInitialized();
            resolve();
          },
          error: () => {
            authStore.markInitialized();
            resolve();
          },
        });
      };

      if (token) {
        // Validate existing access token with /me
        authService.getCurrentUser().subscribe({
          next: (user) => {
            authStore.setUser(user);
            loadProfileAndFinish();
          },
          error: () => {
            // Access token expired, attempt refresh via cookie
            attemptRefreshAndRestore(authStore, authService, profileService, profileStore, resolve);
          },
        });
      } else {
        // No access token in storage, but refresh cookie might exist
        attemptRefreshAndRestore(authStore, authService, profileService, profileStore, resolve);
      }
    });
}

function attemptRefreshAndRestore(
  authStore: AuthStore,
  authService: AuthService,
  profileService: ProfileService,
  profileStore: ProfileStore,
  resolve: () => void
): void {
  authService.refresh().subscribe({
    next: (res) => {
      authStore.setAccessToken(res.accessToken);
      authService.getCurrentUser().subscribe({
        next: (user) => {
          authStore.setUser(user);
          profileService.getProfile().subscribe({
            next: (profile) => {
              profileStore.setProfile(profile);
              authStore.markInitialized();
              resolve();
            },
            error: () => {
              authStore.markInitialized();
              resolve();
            },
          });
        },
        error: () => {
          authStore.clearAuth();
          profileStore.clearProfile();
          authStore.markInitialized();
          resolve();
        },
      });
    },
    error: () => {
      authStore.clearAuth();
      profileStore.clearProfile();
      authStore.markInitialized();
      resolve();
    },
  });
}

export const authInitializerProvider = {
  provide: APP_INITIALIZER,
  useFactory: initializeAuth,
  multi: true,
};
