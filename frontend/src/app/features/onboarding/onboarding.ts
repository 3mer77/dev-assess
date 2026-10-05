import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ProfileService } from '../../core/profile/profile.service';
import { ProfileStore } from '../../core/profile/profile.store';
import { AuthStore } from '../../core/auth/auth.store';
import { AuthService } from '../../core/auth/auth.service';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

export interface RolePreset {
  id: string;
  icon: string;
  titleKey: string;
  descKey: string;
}

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslatePipe],
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
  readonly showCustomRole = signal(false);

  readonly currentUser = this.authStore.user;

  readonly roles: RolePreset[] = [
    {
      id: 'Backend development',
      icon: '{ }',
      titleKey: 'onboarding.pathBackend',
      descKey: 'onboarding.pathBackendDesc',
    },
    {
      id: 'Frontend development',
      icon: '⌘',
      titleKey: 'onboarding.pathFrontend',
      descKey: 'onboarding.pathFrontendDesc',
    },
    {
      id: 'Full-stack development',
      icon: '</>',
      titleKey: 'onboarding.pathFullstack',
      descKey: 'onboarding.pathFullstackDesc',
    },
    {
      id: 'AI engineering',
      icon: '❋',
      titleKey: 'onboarding.pathAi',
      descKey: 'onboarding.pathAiDesc',
    },
  ];

  readonly techSuggestions = [
    'Node.js',
    'TypeScript',
    'React',
    'Angular',
    'C# / .NET',
    'Python',
    'SQL & RDBMS',
    'PostgreSQL',
    'Docker',
    'AWS',
    'Redis',
    'Kubernetes',
    'Next.js',
    'GraphQL',
  ];

  readonly experienceLevels = [
    {
      id: 'Junior',
      titleKey: 'onboarding.levelJunior',
      descKey: 'onboarding.levelJuniorDesc',
    },
    {
      id: 'Mid-Level',
      titleKey: 'onboarding.levelMid',
      descKey: 'onboarding.levelMidDesc',
    },
    {
      id: 'Senior',
      titleKey: 'onboarding.levelSenior',
      descKey: 'onboarding.levelSeniorDesc',
    },
  ];

  // Exactly matches backend: 10, 20, 40 minutes
  readonly sessionOptions = [
    { minutes: 10, labelKey: 'onboarding.min10', descKey: '10 min' },
    { minutes: 20, labelKey: 'onboarding.min20', descKey: '20 min (Recommended)' },
    { minutes: 40, labelKey: 'onboarding.min40', descKey: '40 min' },
  ];

  readonly form = this.fb.nonNullable.group({
    selectedRole: ['Full-stack development', [Validators.required]],
    customRole: [''],
    background: [
      'Next.js, Node.js, .NET',
      [Validators.required, Validators.minLength(3), Validators.maxLength(2000)],
    ],
    experienceLevel: ['Mid-Level', [Validators.required]],
    goal: [
      'Sharpen full-stack system architecture and interview reasoning',
      [Validators.required, Validators.minLength(3), Validators.maxLength(500)],
    ],
    preferredSessionMinutes: [20, [Validators.required]],
  });

  ngOnInit(): void {
    if (this.profileStore.hasCompletedOnboarding()) {
      this.router.navigate(['/dashboard']);
    }
  }

  selectRole(roleId: string): void {
    this.form.patchValue({ selectedRole: roleId });
    this.showCustomRole.set(false);

    // Provide helpful defaults for background based on role
    if (roleId === 'Backend development') {
      this.form.patchValue({ background: 'Node.js, C# / .NET, PostgreSQL, Docker' });
    } else if (roleId === 'Frontend development') {
      this.form.patchValue({ background: 'React, Angular, TypeScript, Next.js' });
    } else if (roleId === 'Full-stack development') {
      this.form.patchValue({ background: 'Next.js, Node.js, .NET, PostgreSQL' });
    } else if (roleId === 'AI engineering') {
      this.form.patchValue({ background: 'Python, LLMs, Machine Learning, PyTorch' });
    }
  }

  toggleCustomRole(): void {
    this.showCustomRole.set(true);
    this.form.patchValue({ selectedRole: 'Other' });
  }

  addTechChip(tech: string): void {
    const current = this.form.value.background ?? '';
    if (!current.includes(tech)) {
      const updated = current ? `${current.trim()}, ${tech}` : tech;
      this.form.patchValue({ background: updated });
    }
  }

  selectLevel(levelId: string): void {
    this.form.patchValue({ experienceLevel: levelId });
  }

  selectSessionMinutes(minutes: number): void {
    this.form.patchValue({ preferredSessionMinutes: minutes });
  }

  setLanguage(lang: 'en' | 'ar'): void {
    this.langService.setLanguage(lang);
  }

  goToNextStep(): void {
    this.errorMessage.set('');

    if (this.currentStep() === 1) {
      if (
        this.form.value.selectedRole === 'Other' &&
        !this.form.value.customRole?.trim()
      ) {
        this.errorMessage.set(
          this.langService.currentLanguage() === 'ar'
            ? 'يرجى كتابة المسمى أو المسار المخصص.'
            : 'Please specify your custom engineering role.'
        );
        return;
      }
      this.currentStep.set(2);
      return;
    }

    if (this.currentStep() === 2) {
      if (!this.form.value.background?.trim()) {
        this.errorMessage.set(
          this.langService.currentLanguage() === 'ar'
            ? 'يرجى تحديد أو كتابة التقنيات التي تعمل بها.'
            : 'Please describe your background or select technologies.'
        );
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
      this.errorMessage.set(
        this.langService.currentLanguage() === 'ar'
          ? 'يرجى ملء جميع الحقول المطلوبة.'
          : 'Please fill out all required fields.'
      );
      return;
    }

    const { selectedRole, customRole, background, goal, experienceLevel, preferredSessionMinutes } =
      this.form.getRawValue();

    const targetRole =
      selectedRole === 'Other' ? customRole.trim() : selectedRole;

    const fullGoal = `${experienceLevel} — ${goal.trim()}`;

    this.loading.set(true);

    this.profileService
      .completeOnboarding({
        targetRole,
        background: background.trim(),
        goal: fullGoal,
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

