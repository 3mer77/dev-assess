import {
  Component,
  inject,
  signal,
  computed,
  OnInit,
  OnDestroy,
  ViewChildren,
  QueryList,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';
import { AuthLayout, StepItem } from '../../../shared/components/auth-layout/auth-layout';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AuthLayout, TranslatePipe],
  templateUrl: './verify-email.html',
  styleUrl: './verify-email.css',
})
export class VerifyEmail implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  readonly langService = inject(LanguageService);

  @ViewChildren('otpInput') otpInputs!: QueryList<ElementRef<HTMLInputElement>>;

  readonly email = signal('');
  readonly digits = signal<string[]>(['', '', '', '', '', '']);
  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly resendMessage = signal('');
  readonly resendLoading = signal(false);
  readonly resendTimer = signal(60);

  readonly authSteps = computed<StepItem[]>(() => [
    { label: this.langService.t('auth.createAccountLink'), status: 'completed' },
    { label: this.langService.t('verify.title'), status: 'active' },
    { label: this.langService.t('onboarding.step1Label'), status: 'upcoming' },
  ]);

  private timerInterval: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    const emailParam = this.route.snapshot.queryParamMap.get('email');

    if (!emailParam) {
      this.router.navigate(['/register']);
      return;
    }

    this.email.set(emailParam);
    this.startResendTimer();
  }

  ngOnDestroy(): void {
    this.clearTimer();
  }

  // ── OTP digit handling ────────────────────────

  onDigitInput(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;

    // Filter to last character entered, digits only
    const digit = value.replace(/\D/g, '').slice(-1);

    const currentDigits = [...this.digits()];
    currentDigits[index] = digit;
    this.digits.set(currentDigits);
    input.value = digit;

    this.errorMessage.set('');

    // Auto-advance to next input
    if (digit && index < 5) {
      this.focusInput(index + 1);
    }

    // Auto-submit when all 6 digits are entered
    if (currentDigits.every((d) => d !== '') && currentDigits.length === 6) {
      this.submitCode();
    }
  }

  onDigitKeydown(index: number, event: KeyboardEvent): void {
    // Backspace on empty input → go to previous
    if (event.key === 'Backspace') {
      const currentDigits = [...this.digits()];

      if (!currentDigits[index] && index > 0) {
        currentDigits[index - 1] = '';
        this.digits.set(currentDigits);
        this.focusInput(index - 1);
        event.preventDefault();
      } else {
        currentDigits[index] = '';
        this.digits.set(currentDigits);
      }
    }

    // Arrow keys for navigation
    if (event.key === 'ArrowLeft' && index > 0) {
      this.focusInput(index - 1);
    }
    if (event.key === 'ArrowRight' && index < 5) {
      this.focusInput(index + 1);
    }
  }

  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pasted = event.clipboardData?.getData('text') ?? '';
    const cleanDigits = pasted.replace(/\D/g, '').slice(0, 6).split('');

    if (cleanDigits.length === 0) return;

    const newDigits = ['', '', '', '', '', ''];
    cleanDigits.forEach((d, i) => {
      newDigits[i] = d;
    });

    this.digits.set(newDigits);

    // Sync DOM inputs
    const inputsArray = this.otpInputs.toArray();
    newDigits.forEach((d, i) => {
      if (inputsArray[i]) {
        inputsArray[i].nativeElement.value = d;
      }
    });

    // Focus next empty or last
    const nextEmpty = newDigits.findIndex((d) => d === '');
    if (nextEmpty !== -1) {
      this.focusInput(nextEmpty);
    } else {
      this.focusInput(5);
      // Auto-submit if complete
      this.submitCode();
    }
  }

  private focusInput(index: number): void {
    const inputsArray = this.otpInputs.toArray();
    if (inputsArray[index]) {
      inputsArray[index].nativeElement.focus();
      inputsArray[index].nativeElement.select();
    }
  }

  // ── Verification ──────────────────────────────

  submitCode(): void {
    const code = this.digits().join('');

    if (code.length !== 6) return;

    this.loading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.authService
      .verifyEmail({ email: this.email(), code })
      .subscribe((result) => {
        this.loading.set(false);

        if (!result.success) {
          this.errorMessage.set(result.errors?.[0] ?? 'Verification failed.');
          return;
        }

        this.successMessage.set('Email verified successfully! Redirecting to sign in…');

        setTimeout(() => {
          this.router.navigate(['/login'], {
            state: { emailVerified: true, email: this.email() },
          });
        }, 1200);
      });
  }

  // ── Resend ────────────────────────────────────

  resendCode(): void {
    if (this.resendTimer() > 0 || this.resendLoading()) return;

    this.resendLoading.set(true);
    this.resendMessage.set('');

    this.authService
      .resendVerification({ email: this.email() })
      .subscribe((result) => {
        this.resendLoading.set(false);

        if (!result.success) {
          this.resendMessage.set(result.errors?.[0] ?? 'Unable to resend.');
          if (result.errors?.[0]?.includes('Too many')) {
            this.startResendTimer();
          }
          return;
        }

        this.resendMessage.set('A new verification code has been sent.');
        this.startResendTimer();
      });
  }

  // ── Timer ─────────────────────────────────────

  private startResendTimer(): void {
    this.clearTimer();
    this.resendTimer.set(60);

    this.timerInterval = setInterval(() => {
      this.resendTimer.update((v) => {
        if (v <= 1) {
          this.clearTimer();
          return 0;
        }
        return v - 1;
      });
    }, 1000);
  }

  private clearTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  get formattedTimer(): string {
    const seconds = this.resendTimer();
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}
