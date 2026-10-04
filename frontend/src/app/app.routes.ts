import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { onboardingGuard } from './core/guards/onboarding.guard';
import { publicAuthGuard } from './core/guards/public-auth.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./features/landing/landing-page/landing-page').then(
        (m) => m.LandingPage
      ),
  },
  {
    path: 'register',
    canActivate: [publicAuthGuard],
    loadComponent: () =>
      import('./features/auth/register/register').then((m) => m.Register),
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
      import('./features/auth/login/login').then((m) => m.Login),
  },
  {
    path: 'onboarding',
    canActivate: [onboardingGuard],
    loadComponent: () =>
      import('./features/onboarding/onboarding').then((m) => m.Onboarding),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./shared/components/app-shell/app-shell').then(
        (m) => m.AppShell
      ),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard-home/dashboard-home').then(
            (m) => m.DashboardHome
          ),
      },
      {
        path: 'practice',
        loadComponent: () =>
          import('./features/practice/practice-page/practice-page').then(
            (m) => m.PracticePage
          ),
      },
      {
        path: 'skills',
        loadComponent: () =>
          import('./features/skills/skills-page/skills-page').then(
            (m) => m.SkillsPage
          ),
      },
      {
        path: 'history',
        loadComponent: () =>
          import('./features/history/history-page/history-page').then(
            (m) => m.HistoryPage
          ),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/profile/profile-page/profile-page').then(
            (m) => m.ProfilePage
          ),
      },
      {
        path: 'session/:id',
        loadComponent: () =>
          import('./features/session/session-workspace/session-workspace').then(
            (m) => m.SessionWorkspace
          ),
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
