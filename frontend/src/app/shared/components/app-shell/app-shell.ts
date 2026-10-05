import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet, NavigationEnd } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, finalize } from 'rxjs';
import { AuthStore } from '../../../core/auth/auth.store';
import { AuthService } from '../../../core/auth/auth.service';
import { ProfileStore } from '../../../core/profile/profile.store';
import { SessionService } from '../../../core/session/session.service';
import { ThemeService, ThemePreference } from '../../../core/theme/theme.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet, TranslatePipe],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.css',
})
export class AppShell {
  private readonly authStore = inject(AuthStore);
  private readonly authService = inject(AuthService);
  private readonly profileStore = inject(ProfileStore);
  private readonly sessionService = inject(SessionService);
  private readonly router = inject(Router);
  readonly themeService = inject(ThemeService);
  readonly langService = inject(LanguageService);

  readonly user = this.authStore.user;
  readonly profile = this.profileStore.profile;
  readonly isStartingSession = signal(false);

  // Track current URL reactively for the breadcrumb
  private readonly navEnd$ = this.router.events.pipe(
    filter((e): e is NavigationEnd => e instanceof NavigationEnd),
    map((e) => e.urlAfterRedirects || e.url)
  );
  readonly currentUrl = toSignal(this.navEnd$, { initialValue: this.router.url });

  readonly currentSectionKey = computed(() => {
    const url = this.currentUrl() || '';
    if (url.includes('/session')) return 'session.title';
    if (url.includes('/skills')) return 'nav.learningPath';
    if (url.includes('/history')) return 'nav.sessions';
    if (url.includes('/profile')) return 'nav.settings';
    return 'nav.overview';
  });

  startNewSession(): void {
    if (this.isStartingSession()) return;
    this.isStartingSession.set(true);

    this.sessionService
      .createSession()
      .pipe(
        finalize(() => {
          this.isStartingSession.set(false);
        })
      )
      .subscribe({
        next: (session) => {
          if (session && session.id) {
            this.router.navigate(['/session', session.id]);
          }
        },
        error: (err) => {
          console.error('Failed to create session from topbar', err);
          this.router.navigate(['/dashboard']);
        },
      });
  }

  setTheme(pref: ThemePreference): void {
    this.themeService.setPreference(pref);
  }

  setLanguage(lang: 'en' | 'ar'): void {
    this.langService.setLanguage(lang);
  }

  signOut(): void {
    this.authService
      .logout()
      .pipe(
        finalize(() => {
          this.authStore.clearAuth();
          this.profileStore.clearProfile();
          this.router.navigate(['/login']);
        })
      )
      .subscribe({
        error: (err) => {
          console.error('Logout error:', err);
        },
      });
  }
}

