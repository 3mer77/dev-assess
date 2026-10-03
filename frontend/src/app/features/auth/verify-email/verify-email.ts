import {
  Component,
  inject,
  signal,
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

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './verify-email.html',
  styleUrl: './verify-email.css',
})
export class VerifyEmail implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  @ViewChildren('otpInput') otpInputs!: QueryList<ElementRef<HTMLInputElement>>;

  readonly email = signal('');
  readonly digits = signal<string[]>(['', '', '', '', '', '']);
  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly resendMessage = signal('');
  readonly resendLoading = signal(false);
  readonly resendTimer = signal(60);

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

    // Allow only single digit
    if (value.length > 1) {
      input.value = value.charAt(value.length - 1);
    }

    // Accept only numeric
    if (!/^\d$/.test(input.value)) {
      input.value = '';
      this.updateDigit(index, '');
      return;
    }

    this.updateDigit(index, input.value);

    // Auto-advance to next box
    if (input.value && index < 5) {
      const inputs = this.otpInputs.toArray();
      inputs[index + 1]?.nativeElement.focus();
    }

    // Auto-submit when all 6 filled
    const currentDigits = this.digits();
    if (currentDigits.every((d) => d !== '')) {
      this.submitCode();
    }
  }

  onDigitKeydown(index: number, event: KeyboardEvent): void {
    // Backspace: clear current, then move back
    if (event.key === 'Backspace') {
      const currentDigits = this.digits();
      if (!currentDigits[index] && index > 0) {
        const inputs = this.otpInputs.toArray();
        this.updateDigit(index - 1, '');
        inputs[index - 1]?.nativeElement.focus();
        event.preventDefault();
      } else {
        this.updateDigit(index, '');
      }
    }

    // Arrow keys
    if (event.key === 'ArrowLeft' && index > 0) {
      const inputs = this.otpInputs.toArray();
      inputs[index - 1]?.nativeElement.focus();
      event.preventDefault();
    }
    if (event.key === 'ArrowRight' && index < 5) {
      const inputs = this.otpInputs.toArray();
      inputs[index + 1]?.nativeElement.focus();
      event.preventDefault();
    }
  }

  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const paste = event.clipboardData?.getData('text')?.trim() ?? '';
    const digits = paste.replace(/\D/g, '').slice(0, 6).split('');

    if (digits.length === 0) return;

    const newDigits = [...this.digits()];
    const inputs = this.otpInputs.toArray();

    for (let i = 0; i < 6; i++) {
      newDigits[i] = digits[i] ?? '';
    }

    this.digits.set(newDigits);

    // Update actual input values
    inputs.forEach((ref, i) => {
      ref.nativeElement.value = newDigits[i];
    });

    // Focus last filled or next empty
    const lastFilled = Math.min(digits.length, 6) - 1;
    if (lastFilled < 5) {
      inputs[lastFilled + 1]?.nativeElement.focus();
    } else {
      inputs[5]?.nativeElement.focus();
    }

    // Auto-submit if all filled
    if (newDigits.every((d) => d !== '')) {
      this.submitCode();
    }
  }

  private updateDigit(index: number, value: string): void {
    const current = [...this.digits()];
    current[index] = value;
    this.digits.set(current);
  }

  // ── Submit ────────────────────────────────────

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

        if (result.success) {
          this.successMessage.set('Email verified successfully!');

          // Brief pause so user sees success, then navigate to login
          setTimeout(() => {
            this.router.navigate(['/login'], {
              state: { emailVerified: true },
            });
          }, 1200);
        } else {
          this.errorMessage.set(result.errors[0] ?? 'Verification failed.');
        }
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

        if (result.success) {
          this.resendMessage.set('A new verification code has been sent.');
          this.startResendTimer();
        } else {
          this.resendMessage.set(result.errors[0] ?? 'Unable to resend.');
          // Still restart timer on rate-limit to match backend cooldown
          if (result.errors[0]?.includes('Too many')) {
            this.startResendTimer();
          }
        }
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
    if (this.timerInterval !== null) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  get formattedTimer(): string {
    const secs = this.resendTimer();
    return `00:${secs.toString().padStart(2, '0')}`;
  }
}
