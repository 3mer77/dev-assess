import {
  HttpInterceptorFn,
  HttpErrorResponse,
  HttpContextToken,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  catchError,
  throwError,
  switchMap,
  map,
  shareReplay,
  finalize,
  Observable,
} from 'rxjs';
import { AuthStore } from '../auth/auth.store';
import { AuthService } from '../auth/auth.service';
import { environment } from '../../../environments/environment';

/**
 * Context token to flag requests that have already been retried once after token refresh.
 * Guarantees that any request is retried at most once, preventing infinite retry loops.
 */
export const IS_RETRY = new HttpContextToken<boolean>(() => false);

/**
 * Single-flight in-progress refresh observable.
 * If multiple concurrent requests hit 401, only ONE refresh request is fired.
 * All pending requests share this observable and retry once it emits the new token.
 */
let refreshInProgress$: Observable<string> | null = null;

/**
 * Endpoints that must NEVER trigger refresh logic.
 * - Login: 401 means invalid credentials, show error
 * - Register, VerifyEmail, Resend: public endpoints
 * - Refresh: 401 means session expired/invalid, do not loop
 * - Logout: revoking token, do not refresh
 */
function isBypassedAuthUrl(url: string): boolean {
  return (
    url.includes('/Auth/login') ||
    url.includes('/Auth/register') ||
    url.includes('/Auth/verify-email') ||
    url.includes('/Auth/resend-verification') ||
    url.includes('/Auth/refresh') ||
    url.includes('/Auth/logout')
  );
}

/**
 * Functional HTTP interceptor (Angular 22 preferred pattern).
 *
 * Responsibilities:
 * 1. Attaches Bearer token to API requests.
 * 2. On 401 from protected endpoints, initiates single-flight refresh.
 * 3. Retries failed requests with new access token (max once).
 * 4. On refresh failure, clears auth state and routes to /login.
 * 5. Ignores public auth and third-party requests.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authStore = inject(AuthStore);
  const authService = inject(AuthService);
  const router = inject(Router);

  const isApiRequest = req.url.startsWith(environment.apiUrl);

  let request = req;
  const token = authStore.accessToken();

  if (isApiRequest && token) {
    request = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      // Only handle 401 on our own API requests
      if (error.status !== 401 || !isApiRequest) {
        return throwError(() => error);
      }

      // Do NOT refresh on login, register, verify-email, refresh itself, or logout
      if (isBypassedAuthUrl(req.url)) {
        return throwError(() => error);
      }

      // If this request already retried once after refresh and failed again, give up
      if (req.context.get(IS_RETRY)) {
        authStore.clearAuth();
        if (!router.url.startsWith('/login')) {
          router.navigate(['/login']);
        }
        return throwError(() => error);
      }

      // If a refresh has already completed and we now have a newer token than what was sent
      const currentToken = authStore.accessToken();
      if (currentToken && currentToken !== token) {
        const retried = req.clone({
          setHeaders: {
            Authorization: `Bearer ${currentToken}`,
          },
          context: req.context.set(IS_RETRY, true),
        });
        return next(retried);
      }

      // Single-flight refresh: create or reuse in-flight refresh observable
      if (!refreshInProgress$) {
        refreshInProgress$ = authService.refresh().pipe(
          map((res) => {
            authStore.setAccessToken(res.accessToken);
            return res.accessToken;
          }),
          catchError((refreshErr) => {
            authStore.clearAuth();
            if (!router.url.startsWith('/login')) {
              router.navigate(['/login']);
            }
            return throwError(() => refreshErr);
          }),
          finalize(() => {
            refreshInProgress$ = null;
          }),
          shareReplay(1)
        );
      }

      return refreshInProgress$.pipe(
        switchMap((newToken) => {
          const retried = req.clone({
            setHeaders: {
              Authorization: `Bearer ${newToken}`,
            },
            context: req.context.set(IS_RETRY, true),
          });
          return next(retried);
        })
      );
    })
  );
};
