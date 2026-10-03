import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthStore } from '../auth/auth.store';
import { environment } from '../../../environments/environment';

/**
 * Functional HTTP interceptor (Angular 22 preferred pattern).
 *
 * - Attaches Bearer token to requests targeting our API.
 * - On 401 from a protected call, clears auth state and redirects to /login.
 * - Does NOT intercept requests to third-party URLs.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authStore = inject(AuthStore);
  const router = inject(Router);

  // Only attach token to our own API calls
  const isApiRequest = req.url.startsWith(environment.apiUrl);

  let request = req;

  if (isApiRequest) {
    const token = authStore.accessToken();
    if (token) {
      request = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      });
    }
  }

  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      // If a protected API call returns 401, clear auth and go to login.
      // Avoid redirect loops: don't redirect if we're already on /login
      // or if this was the login request itself.
      if (
        error.status === 401 &&
        isApiRequest &&
        !req.url.endsWith('/Auth/login') &&
        !router.url.startsWith('/login')
      ) {
        authStore.clearAuth();
        router.navigate(['/login']);
      }
      return throwError(() => error);
    })
  );
};
