import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AuthResult,
  RegisterRequest,
  VerifyEmailRequest,
  ResendVerificationRequest,
  LoginRequest,
  LoginResponse,
  User,
} from './auth.models';

/**
 * Owns all HTTP communication with the ASP.NET Auth API.
 *
 * Responsibilities:
 * - construct URLs
 * - make HTTP calls
 * - map HTTP errors into user-facing AuthResult
 *
 * Components never see HttpErrorResponse, status codes,
 * or raw backend error bodies.
 */

/** Shape the backend may return inside error responses */
interface ApiErrorBody {
  message?: string;
  errors?: string[];
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/Auth`;

  register(request: RegisterRequest): Observable<AuthResult<User>> {
    return this.http
      .post<User>(`${this.baseUrl}/register`, request)
      .pipe(
        map((user) => ({ success: true as const, data: user })),
        catchError((err: HttpErrorResponse) => of(this.mapError(err, 'Registration failed. Please try again.')))
      );
  }

  verifyEmail(request: VerifyEmailRequest): Observable<AuthResult<string>> {
    return this.http
      .post<{ message: string }>(`${this.baseUrl}/verify-email`, request)
      .pipe(
        map((res) => ({ success: true as const, data: res.message })),
        catchError((err: HttpErrorResponse) => of(this.mapError(err, 'Invalid or expired verification code.')))
      );
  }

  resendVerification(request: ResendVerificationRequest): Observable<AuthResult<string>> {
    return this.http
      .post<{ message: string }>(`${this.baseUrl}/resend-verification`, request)
      .pipe(
        map((res) => ({ success: true as const, data: res.message })),
        catchError((err: HttpErrorResponse) => of(this.mapError(err, 'Unable to resend code.')))
      );
  }

  login(request: LoginRequest): Observable<AuthResult<LoginResponse>> {
    return this.http
      .post<LoginResponse>(`${this.baseUrl}/login`, request)
      .pipe(
        map((res) => {
          if (res.succeeded && res.accessToken && res.user) {
            return { success: true as const, data: res };
          }
          // Backend returned 200 but login didn't succeed
          return { success: false as const, errors: [res.error ?? 'Login failed.'] };
        }),
        catchError((err: HttpErrorResponse) => of(this.mapError(err, 'Invalid email or password.')))
      );
  }

  getCurrentUser(): Observable<User> {
    return this.http.get<User>(`${this.baseUrl}/me`);
  }

  // ── Private: HTTP error → user-facing messages ──────────

  /**
   * Translates HttpErrorResponse into a clean AuthResult failure.
   *
   * This is the ONLY place that reads HTTP status codes or
   * parses raw backend error bodies. Components never do this.
   */
  private mapError(err: HttpErrorResponse, fallback: string): AuthResult<never> {
    // Network unreachable
    if (err.status === 0) {
      return { success: false, errors: ['Unable to reach DevAssess. Please try again.'] };
    }

    // Rate limited
    if (err.status === 429) {
      return { success: false, errors: ['Too many attempts. Please wait a moment and try again.'] };
    }

    // Backend returned structured errors
    const body = err.error as ApiErrorBody | undefined;

    if (body?.errors?.length) {
      return { success: false, errors: body.errors };
    }

    if (body?.message) {
      return { success: false, errors: [body.message] };
    }

    return { success: false, errors: [fallback] };
  }
}
