import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthStore } from '../../../core/auth/auth.store';
import { ProfileStore } from '../../../core/profile/profile.store';
import { ProfileService } from '../../../core/profile/profile.service';
import { SessionService } from '../../../core/session/session.service';
import { SessionHistoryService, SessionHistoryItem } from '../../../core/session/session-history.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe, DatePipe],
  templateUrl: './dashboard-home.html',
  styleUrl: './dashboard-home.css',
})
export class DashboardHome implements OnInit {
  private readonly authStore = inject(AuthStore);
  private readonly profileStore = inject(ProfileStore);
  private readonly profileService = inject(ProfileService);
  private readonly sessionService = inject(SessionService);
  private readonly historyService = inject(SessionHistoryService);
  private readonly router = inject(Router);
  readonly langService = inject(LanguageService);

  readonly user = this.authStore.user;
  readonly profile = this.profileStore.profile;

  readonly isGenerating = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  readonly recentSessions = computed<SessionHistoryItem[]>(() => {
    return this.historyService.sessions().slice(0, 3);
  });

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

  triggerFirstSession(): void {
    if (this.isGenerating()) return;

    this.isGenerating.set(true);
    this.errorMessage.set(null);

    this.sessionService
      .createSession()
      .pipe(
        finalize(() => {
          this.isGenerating.set(false);
        })
      )
      .subscribe({
        next: (session) => {
          if (session && session.id) {
            this.router.navigate(['/session', session.id]);
          }
        },
        error: (err) => {
          console.error('Session creation failed', err);
          const msg =
            err.error?.message ||
            err.error?.title ||
            'session.creationError';
          this.errorMessage.set(msg);
        },
      });
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'Completed':
        return 'badge-success';
      case 'InProgress':
        return 'badge-accent';
      case 'Submitted':
      case 'Evaluating':
        return 'badge-warning';
      default:
        return 'badge-default';
    }
  }

  getStatusLabelKey(status: string): string {
    switch (status) {
      case 'Completed':
        return 'session.statusCompleted';
      case 'InProgress':
        return 'session.statusInProgress';
      case 'Submitted':
        return 'session.statusSubmitted';
      case 'Evaluating':
        return 'session.statusEvaluating';
      default:
        return 'session.statusGenerated';
    }
  }
}
