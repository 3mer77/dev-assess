import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { ProfileService } from '../../core/profile/profile.service';
import { ProfileStore } from '../../core/profile/profile.store';
import { AuthStore } from '../../core/auth/auth.store';
import { AuthService } from '../../core/auth/auth.service';
import { AuthLayout, StepItem } from '../../shared/components/auth-layout/auth-layout';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AuthLayout, TranslatePipe],
  templateUrl: './onboarding.html',
  styleUrl: './onboarding.css',
})
export class Onboarding implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly profileService = inject(ProfileService);
  private readonly profileStore = inject(ProfileStore);
  private readonly authStore = inject(AuthStore);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  readonly langService = inject(LanguageService);

  readonly currentStep = signal<1 | 2 | 3>(1);
  readonly loading = signal(false);
  readonly errorMessage = signal('');

  readonly currentUser = this.authStore.user;

  readonly roles = [
    { id: 'Backend Engineer', title: 'Backend Engineer', desc: 'APIs, microservices, databases, system design' },
    { id: 'Frontend Engineer', title: 'Frontend Engineer', desc: 'UI architecture, performance, reactive state' },
    { id: 'Full-Stack Engineer', title: 'Full-Stack Engineer', desc: 'End-to-end applications, distributed web apps' },
    { id: 'DevOps / Cloud', title: 'DevOps / Cloud', desc: 'CI/CD, container orchestration, cloud infra' },
    { id: 'Mobile Engineer', title: 'Mobile Engineer', desc: 'Cross-platform & native mobile engineering' },
    { id: 'Other', title: 'Other Specialization', desc: 'Specify your custom technical discipline' },
  ];

  readonly techSuggestions = [
    'Node.js',
    'TypeScript',
    'React',
    'Angular',
    'C# / .NET',
    'SQL & RDBMS',
    'Docker',
    'Python',
    'PostgreSQL',
    'AWS',
    'Redis',
    'Kubernetes',
  ];

  // Exactly matches backend: 10, 20, 40
  readonly sessionOptions = [
    { minutes: 10, label: '10 min', desc: 'Quick daily drill' },
    { minutes: 20, label: '20 min', desc: 'Balanced focus session (Recommended)' },
    { minutes: 40, label: '40 min', desc: 'Deep architecture challenge' },
  ];

  readonly form = this.fb.nonNullable.group({
    selectedRole: ['Backend Engineer', [Validators.required]],
    customRole: [''],
    background: [
      '',
      [Validators.required, Validators.minLength(5), Validators.maxLength(2000)],
    ],
    goal: [
      '',
      [Validators.required, Validators.minLength(5), Validators.maxLength(500)],
    ],
    preferredSessionMinutes: [20, [Validators.required]],
  });

  get steps(): StepItem[] {
    const s = this.currentStep();
    return [
      {
        label: this.langService.t('onboarding.step1Label'),
        status: s > 1 ? 'completed' : s === 1 ? 'active' : 'upcoming',
      },
      {
        label: this.langService.t('onboarding.step2Label'),
        status: s > 2 ? 'completed' : s === 2 ? 'active' : 'upcoming',
      },
      {
        label: this.langService.t('onboarding.step3Label'),
        status: s === 3 ? 'active' : 'upcoming',
      },
    ];
  }

  ngOnInit(): void {
    // If onboarding is already finished, go to dashboard
    if (this.profileStore.hasCompletedOnboarding()) {
      this.router.navigate(['/dashboard']);
    }
  }

  selectRole(roleId: string): void {
    this.form.patchValue({ selectedRole: roleId });
  }

  addTechChip(tech: string): void {
    const current = this.form.value.background ?? '';
    if (!current.includes(tech)) {
      const updated = current ? `${current.trim()}, ${tech}` : tech;
      this.form.patchValue({ background: updated });
    }
  }

  selectSessionMinutes(minutes: number): void {
    this.form.patchValue({ preferredSessionMinutes: minutes });
  }

  goToNextStep(): void {
    this.errorMessage.set('');

    if (this.currentStep() === 1) {
      if (
        this.form.value.selectedRole === 'Other' &&
        !this.form.value.customRole?.trim()
      ) {
        this.errorMessage.set('Please specify your custom engineering role.');
        return;
      }
      this.currentStep.set(2);
      return;
    }

    if (this.currentStep() === 2) {
      if (!this.form.value.background?.trim()) {
        this.errorMessage.set('Please describe your background or select technologies.');
        return;
      }
      this.currentStep.set(3);
      return;
    }
  }

  goToPreviousStep(): void {
    this.errorMessage.set('');
    const prev = (this.currentStep() - 1) as 1 | 2;
    if (prev >= 1) {
      this.currentStep.set(prev);
    }
  }

  submitOnboarding(): void {
    this.errorMessage.set('');

    if (this.form.invalid) {
      this.errorMessage.set('Please fill out all required fields.');
      return;
    }

    const { selectedRole, customRole, background, goal, preferredSessionMinutes } =
      this.form.getRawValue();

    const targetRole =
      selectedRole === 'Other' ? customRole.trim() : selectedRole;

    this.loading.set(true);

    this.profileService
      .completeOnboarding({
        targetRole,
        background: background.trim(),
        goal: goal.trim(),
        preferredSessionMinutes,
      })
      .subscribe((result) => {
        this.loading.set(false);

        if (!result.success || !result.data) {
          this.errorMessage.set(result.error ?? 'Unable to complete setup.');
          return;
        }

        this.profileStore.setProfile(result.data);
        this.router.navigate(['/dashboard']);
      });
  }

  onLogout(): void {
    this.authService
      .logout()
      .pipe(
        finalize(() => {
          this.authStore.clearAuth();
          this.profileStore.clearProfile();
          this.router.navigate(['/login']);
        })
      )
      .subscribe();
  }
}
