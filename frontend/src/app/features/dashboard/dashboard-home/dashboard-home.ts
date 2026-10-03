import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthStore } from '../../../core/auth/auth.store';
import { AuthService } from '../../../core/auth/auth.service';
import { ProfileStore } from '../../../core/profile/profile.store';
import { ProfileService } from '../../../core/profile/profile.service';
import { ThemeService, ThemePreference } from '../../../core/theme/theme.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

export type DashboardSection = 'home' | 'practice' | 'skills' | 'history' | 'profile';

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './dashboard-home.html',
  styleUrl: './dashboard-home.css',
})
export class DashboardHome implements OnInit {
  private readonly authStore = inject(AuthStore);
  private readonly authService = inject(AuthService);
  private readonly profileStore = inject(ProfileStore);
  private readonly profileService = inject(ProfileService);
  private readonly router = inject(Router);
  readonly themeService = inject(ThemeService);
  readonly langService = inject(LanguageService);

  readonly user = this.authStore.user;
  readonly profile = this.profileStore.profile;

  readonly activeSection = signal<DashboardSection>('home');
  readonly showPlannerNotice = signal<boolean>(false);

  ngOnInit(): void {
    if (!this.profile()) {
      this.profileService.getProfile().subscribe({
        next: (p) => {
          this.profileStore.setProfile(p);
        },
        error: (err) => {
          console.warn('Could not fetch learning profile', err);
        },
      });
    }
  }

  setSection(section: DashboardSection): void {
    this.activeSection.set(section);
  }

  setTheme(pref: ThemePreference): void {
    this.themeService.setPreference(pref);
  }

  setLanguage(lang: 'en' | 'ar'): void {
    this.langService.setLanguage(lang);
  }

  triggerFirstSession(): void {
    this.showPlannerNotice.set(true);
  }

  dismissPlannerNotice(): void {
    this.showPlannerNotice.set(false);
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
