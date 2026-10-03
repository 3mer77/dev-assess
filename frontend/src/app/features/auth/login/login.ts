import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { AuthStore } from '../../../core/auth/auth.store';
import { ProfileService } from '../../../core/profile/profile.service';
import { ProfileStore } from '../../../core/profile/profile.store';
import { AuthLayout, StepItem } from '../../../shared/components/auth-layout/auth-layout';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, AuthLayout, TranslatePipe],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly authStore = inject(AuthStore);
  private readonly profileService = inject(ProfileService);
  private readonly profileStore = inject(ProfileStore);
  private readonly router = inject(Router);
  readonly langService = inject(LanguageService);

  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly isUnverifiedEmail = signal(false);
  readonly verifiedMessage = signal('');
  readonly showPassword = signal(false);

  readonly authSteps = computed<StepItem[]>(() => [
    { label: this.langService.t('login.submitBtn'), status: 'active' },
    { label: this.langService.t('nav.practice'), status: 'upcoming' },
    { label: this.langService.t('nav.skills'), status: 'upcoming' },
  ]);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  get f() {
    return this.form.controls;
  }

  ngOnInit(): void {
    const state = history.state;
    if (state?.emailVerified) {
      this.verifiedMessage.set('Email verified successfully! Please sign in to continue.');
      if (state.email) {
        this.form.patchValue({ email: state.email });
      }
    }

    if (this.authStore.isAuthenticated()) {
      if (this.profileStore.hasCompletedOnboarding()) {
        this.router.navigate(['/dashboard']);
      } else {
        this.router.navigate(['/onboarding']);
      }
    }
  }

  togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  onSubmit(): void {
    this.form.markAllAsTouched();
    this.errorMessage.set('');
    this.isUnverifiedEmail.set(false);

    if (this.form.invalid) return;

    this.loading.set(true);

    const { email, password } = this.form.getRawValue();

    this.authService.login({ email, password }).subscribe((result) => {
      this.loading.set(false);

      if (!result.success || !result.data) {
        const error = result.errors?.[0] ?? 'Invalid email or password.';
        this.errorMessage.set(error);
        if (error.toLowerCase().includes('verify your email')) {
          this.isUnverifiedEmail.set(true);
        }
        return;
      }

      this.authStore.setAuth(result.data.accessToken, result.data.user);

      // Determine destination based on onboarding state
      this.profileService.getProfile().subscribe({
        next: (profile) => {
          this.profileStore.setProfile(profile);
          if (profile?.onboardingCompleted) {
            this.router.navigate(['/dashboard']);
          } else {
            this.router.navigate(['/onboarding']);
          }
        },
        error: () => {
          this.router.navigate(['/onboarding']);
        },
      });
    });
  }
}
