import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { AuthStore } from '../../../core/auth/auth.store';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly verifiedMessage = signal('');
  readonly showPassword = signal(false);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  get f() {
    return this.form.controls;
  }

  ngOnInit(): void {
    // Check for email verification success state from navigation
    const navState = this.router.getCurrentNavigation()?.extras.state;
    if (navState?.['emailVerified']) {
      this.verifiedMessage.set('Email verified successfully. You can now sign in.');
    }

    // If already authenticated, redirect to dashboard
    if (this.authStore.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
    }
  }

  togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  onSubmit(): void {
    this.form.markAllAsTouched();
    this.errorMessage.set('');

    if (this.form.invalid) return;

    this.loading.set(true);

    const { email, password } = this.form.getRawValue();

    this.authService.login({ email, password }).subscribe((result) => {
      this.loading.set(false);

      if (result.success) {
        this.authStore.setAuth(result.data.accessToken, result.data.user);
        this.router.navigate(['/dashboard']);
      } else {
        this.errorMessage.set(result.errors[0] ?? 'Login failed.');
      }
    });
  }
}
