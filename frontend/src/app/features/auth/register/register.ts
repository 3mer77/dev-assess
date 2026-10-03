import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { AuthLayout, StepItem } from '../../../shared/components/auth-layout/auth-layout';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, AuthLayout, TranslatePipe],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  readonly langService = inject(LanguageService);

  readonly loading = signal(false);
  readonly serverErrors = signal<string[]>([]);
  readonly showPassword = signal(false);
  readonly showConfirmPassword = signal(false);

  readonly authSteps = computed<StepItem[]>(() => [
    { label: this.langService.t('auth.createAccountLink'), status: 'active' },
    { label: this.langService.t('verify.title'), status: 'upcoming' },
    { label: this.langService.t('onboarding.step1Label'), status: 'upcoming' },
  ]);

  readonly form = this.fb.nonNullable.group({
    displayName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]],
  });

  get f() {
    return this.form.controls;
  }

  get passwordsMatch(): boolean {
    return this.form.value.password === this.form.value.confirmPassword;
  }

  togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  toggleConfirmPassword(): void {
    this.showConfirmPassword.update((v) => !v);
  }

  onSubmit(): void {
    this.form.markAllAsTouched();
    this.serverErrors.set([]);

    if (this.form.invalid || !this.passwordsMatch) {
      return;
    }

    this.loading.set(true);

    const { displayName, email, password } = this.form.getRawValue();

    this.authService.register({ displayName, email, password }).subscribe((result) => {
      this.loading.set(false);

      if (!result.success) {
        this.serverErrors.set(result.errors ?? ['Registration failed.']);
        return;
      }

      this.router.navigate(['/verify-email'], {
        queryParams: { email },
      });
    });
  }
}
