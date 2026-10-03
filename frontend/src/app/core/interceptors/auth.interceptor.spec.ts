import { TestBed } from '@angular/core/testing';
import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { authInterceptor } from './auth.interceptor';
import { AuthStore } from '../auth/auth.store';
import { AuthService } from '../auth/auth.service';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let authStore: AuthStore;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        AuthStore,
        AuthService,
        {
          provide: Router,
          useValue: {
            url: '/dashboard',
            navigate: vi.fn(),
          },
        },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    authStore = TestBed.inject(AuthStore);
    router = TestBed.inject(Router);

    authStore.clearAuth();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('attaches Bearer token to API requests when token exists', () => {
    authStore.setAccessToken('test-token-123');

    http.get('/api/Auth/me').subscribe();

    const req = httpMock.expectOne('/api/Auth/me');
    expect(req.request.headers.get('Authorization')).toBe('Bearer test-token-123');
    req.flush({ id: '1', displayName: 'Test', email: 'test@example.com' });
  });

  it('does NOT attach token to external URLs', () => {
    authStore.setAccessToken('test-token-123');

    http.get('https://example.com/data').subscribe();

    const req = httpMock.expectOne('https://example.com/data');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('does NOT trigger refresh on login failure (401)', () => {
    let errorReceived: HttpErrorResponse | null = null;

    http.post('/api/Auth/login', { email: 'wrong@test.com', password: 'bad' }).subscribe({
      error: (err) => (errorReceived = err),
    });

    const loginReq = httpMock.expectOne('/api/Auth/login');
    loginReq.flush({ message: 'Invalid credentials' }, { status: 401, statusText: 'Unauthorized' });

    // No refresh request should have been fired
    httpMock.expectNone('/api/Auth/refresh');
    expect(errorReceived).not.toBeNull();
    expect(errorReceived!.status).toBe(401);
  });

  it('automatically refreshes token on 401 and retries original request once', () => {
    authStore.setAccessToken('expired-token');
    let responseData: any = null;

    http.get('/api/Auth/me').subscribe({
      next: (res) => (responseData = res),
    });

    // 1. Initial request with expired token fails with 401
    const initialReq = httpMock.expectOne('/api/Auth/me');
    expect(initialReq.request.headers.get('Authorization')).toBe('Bearer expired-token');
    initialReq.flush({ message: 'Token expired' }, { status: 401, statusText: 'Unauthorized' });

    // 2. Interceptor triggers single-flight /api/Auth/refresh
    const refreshReq = httpMock.expectOne('/api/Auth/refresh');
    expect(refreshReq.request.method).toBe('POST');
    refreshReq.flush({ accessToken: 'new-rotated-token' });

    // 3. AuthStore is updated with new token
    expect(authStore.accessToken()).toBe('new-rotated-token');

    // 4. Original request is retried with the new token
    const retryReq = httpMock.expectOne('/api/Auth/me');
    expect(retryReq.request.headers.get('Authorization')).toBe('Bearer new-rotated-token');
    retryReq.flush({ id: '1', displayName: 'Test', email: 'test@example.com' });

    expect(responseData).toEqual({ id: '1', displayName: 'Test', email: 'test@example.com' });
  });

  it('shares ONE refresh request across multiple concurrent 401s', () => {
    authStore.setAccessToken('expired-token');
    let res1: any = null;
    let res2: any = null;

    http.get('/api/Auth/me').subscribe({ next: (r) => (res1 = r) });
    http.get('/api/profile').subscribe({ next: (r) => (res2 = r) });

    // Both initial requests fail with 401
    const req1 = httpMock.expectOne('/api/Auth/me');
    const req2 = httpMock.expectOne('/api/profile');
    req1.flush({}, { status: 401, statusText: 'Unauthorized' });
    req2.flush({}, { status: 401, statusText: 'Unauthorized' });

    // Exactly ONE refresh request must be sent
    const refreshReq = httpMock.expectOne('/api/Auth/refresh');
    refreshReq.flush({ accessToken: 'concurrent-refreshed-token' });

    // Both original requests are retried with the new token
    const retry1 = httpMock.expectOne('/api/Auth/me');
    const retry2 = httpMock.expectOne('/api/profile');
    expect(retry1.request.headers.get('Authorization')).toBe('Bearer concurrent-refreshed-token');
    expect(retry2.request.headers.get('Authorization')).toBe('Bearer concurrent-refreshed-token');

    retry1.flush({ user: 'ok' });
    retry2.flush({ profile: 'ok' });

    expect(res1).toEqual({ user: 'ok' });
    expect(res2).toEqual({ profile: 'ok' });
  });

  it('clears auth and navigates to /login when refresh fails', () => {
    authStore.setAccessToken('bad-token');
    let errorCaught = false;

    http.get('/api/Auth/me').subscribe({
      error: () => (errorCaught = true),
    });

    const initialReq = httpMock.expectOne('/api/Auth/me');
    initialReq.flush({}, { status: 401, statusText: 'Unauthorized' });

    const refreshReq = httpMock.expectOne('/api/Auth/refresh');
    refreshReq.flush({ message: 'Refresh token expired' }, { status: 401, statusText: 'Unauthorized' });

    expect(errorCaught).toBe(true);
    expect(authStore.accessToken()).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('clears auth and navigates to /login if retried request fails with 401 again (no infinite loop)', () => {
    authStore.setAccessToken('token-1');
    let errorCaught = false;

    http.get('/api/Auth/me').subscribe({
      error: () => (errorCaught = true),
    });

    // 1. Initial 401
    httpMock.expectOne('/api/Auth/me').flush({}, { status: 401, statusText: 'Unauthorized' });

    // 2. Refresh succeeds
    httpMock.expectOne('/api/Auth/refresh').flush({ accessToken: 'token-2' });

    // 3. Retried request fails with 401 again
    httpMock.expectOne('/api/Auth/me').flush({}, { status: 401, statusText: 'Unauthorized' });

    // Must NOT call refresh again
    httpMock.expectNone('/api/Auth/refresh');
    expect(errorCaught).toBe(true);
    expect(authStore.accessToken()).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });
});
