// ──────────────────────────────────────────────
// Auth models — mirrors ASP.NET DTOs exactly
// ──────────────────────────────────────────────

export interface User {
  id: string;
  displayName: string;
  email: string;
  emailConfirmed: boolean;
  createdAt: string;
}

export interface RegisterRequest {
  displayName: string;
  email: string;
  password: string;
}

export interface VerifyEmailRequest {
  email: string;
  code: string;
}

export interface ResendVerificationRequest {
  email: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  succeeded: boolean;
  error: string | null;
  accessToken: string;
  user: User;
}

export interface RefreshResponse {
  accessToken: string;
}

// ──────────────────────────────────────────────
// Service-level result types
// Components receive these — never raw HTTP details.
// ──────────────────────────────────────────────

export interface AuthResult<T> {
  success: boolean;
  data?: T;
  errors?: string[];
}

