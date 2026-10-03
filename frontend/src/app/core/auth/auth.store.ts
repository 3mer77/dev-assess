import { Injectable, computed, signal } from '@angular/core';
import { User } from './auth.models';

/**
 * Lightweight auth state using Angular signals.
 *
 * Storage strategy:
 * - sessionStorage for dev persistence (survives refresh, not new tabs).
 * - Clearly isolated so we can swap to HttpOnly cookie / refresh-token later.
 */

const TOKEN_KEY = 'devassess_access_token';
const USER_KEY = 'devassess_user';

@Injectable({ providedIn: 'root' })
export class AuthStore {
  // ── Internal signals ───────────────────────────────
  private readonly _accessToken = signal<string | null>(this.loadToken());
  private readonly _user = signal<User | null>(this.loadUser());
  private readonly _initialized = signal(false);

  // ── Public computed state ──────────────────────────
  readonly accessToken = this._accessToken.asReadonly();
  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => !!this._accessToken() && !!this._user());
  readonly initialized = this._initialized.asReadonly();

  // ── Mutations ──────────────────────────────────────

  setAuth(token: string, user: User): void {
    this._accessToken.set(token);
    this._user.set(user);
    this.saveToken(token);
    this.saveUser(user);
  }

  setUser(user: User): void {
    this._user.set(user);
    this.saveUser(user);
  }

  clearAuth(): void {
    this._accessToken.set(null);
    this._user.set(null);
    this.removeToken();
    this.removeUser();
  }

  markInitialized(): void {
    this._initialized.set(true);
  }

  // ── Session storage helpers (swap later for refresh-token architecture) ──

  private loadToken(): string | null {
    try {
      return sessionStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  }

  private saveToken(token: string): void {
    try {
      sessionStorage.setItem(TOKEN_KEY, token);
    } catch { /* SSR or private mode */ }
  }

  private removeToken(): void {
    try {
      sessionStorage.removeItem(TOKEN_KEY);
    } catch { /* noop */ }
  }

  private loadUser(): User | null {
    try {
      const raw = sessionStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  }

  private saveUser(user: User): void {
    try {
      sessionStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch { /* noop */ }
  }

  private removeUser(): void {
    try {
      sessionStorage.removeItem(USER_KEY);
    } catch { /* noop */ }
  }
}
