import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { onboardingGuard } from './core/guards/onboarding.guard';
import { publicAuthGuard } from './core/guards/public-auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/landing/landing-page/landing-page').then(
        (m) => m.LandingPage
      ),
  },
  {
    path: 'register',
    canActivate: [publicAuthGuard],
    loadComponent: () =>
      import('./features/auth/register/register').then(
        (m) => m.Register
      ),
  },
  {
    path: 'verify-email',
    loadComponent: () =>
      import('./features/auth/verify-email/verify-email').then(
        (m) => m.VerifyEmail
      ),
  },
  {
    path: 'login',
    canActivate: [publicAuthGuard],
    loadComponent: () =>
      import('./features/auth/login/login').then(
        (m) => m.Login
      ),
  },
  {
    path: 'onboarding',
    canActivate: [onboardingGuard],
    loadComponent: () =>
      import('./features/onboarding/onboarding').then(
        (m) => m.Onboarding
      ),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard/dashboard-home/dashboard-home').then(
        (m) => m.DashboardHome
      ),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
