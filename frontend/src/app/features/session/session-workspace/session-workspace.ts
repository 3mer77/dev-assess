import {
  Component,
  inject,
  signal,
  computed,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, Subscription, debounceTime, distinctUntilChanged, switchMap, finalize, of, catchError } from 'rxjs';
import { SessionService } from '../../../core/session/session.service';
import {
  LearningSessionResponse,
  ChallengeResponse,
} from '../../../core/session/session.models';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

export type SaveState = 'saved' | 'saving' | 'error' | 'idle';

@Component({
  selector: 'app-session-workspace',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslatePipe],
  templateUrl: './session-workspace.html',
  styleUrl: './session-workspace.css',
})
export class SessionWorkspace implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly sessionService = inject(SessionService);
  readonly langService = inject(LanguageService);

  readonly sessionId = signal<string>('');
  readonly session = signal<LearningSessionResponse | null>(null);
  readonly isLoading = signal<boolean>(true);
  readonly isStarting = signal<boolean>(false);
  readonly isSubmitting = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly activeChallengeIndex = signal<number>(0);

  // Per-challenge answer text storage (keyed by challenge.id)
  readonly answers = signal<Record<string, string>>({});
  // Per-challenge save status
  readonly saveStatuses = signal<Record<string, SaveState>>({});

  // Submission UI state
  readonly showSubmitModal = signal<boolean>(false);
  readonly submitWarning = signal<string | null>(null);

  // Autosave RxJS Subject
  private readonly answerSubject$ = new Subject<{
    challengeId: string;
    answer: string;
  }>();
  private autosaveSub?: Subscription;

  // Computed Properties
  readonly challenges = computed<ChallengeResponse[]>(() => {
    return this.session()?.challenges || [];
  });

  readonly totalChallenges = computed<number>(() => {
    return this.challenges().length;
  });

  readonly activeChallenge = computed<ChallengeResponse | null>(() => {
    const list = this.challenges();
    if (list.length === 0) return null;
    const idx = this.activeChallengeIndex();
    return list[idx] ?? list[0];
  });

  readonly isFirstChallenge = computed<boolean>(() => {
    return this.activeChallengeIndex() === 0;
  });

  readonly isLastChallenge = computed<boolean>(() => {
    const total = this.totalChallenges();
    return total > 0 && this.activeChallengeIndex() === total - 1;
  });

  readonly isReadOnly = computed<boolean>(() => {
    const status = this.session()?.status;
    return (
      status === 'Submitted' ||
      status === 'Evaluating' ||
      status === 'Completed'
    );
  });

  readonly answeredCount = computed<number>(() => {
    const list = this.challenges();
    const ans = this.answers();
    return list.filter((c) => !!ans[c.id]?.trim()).length;
  });

  readonly allAnswered = computed<boolean>(() => {
    const total = this.totalChallenges();
    return total > 0 && this.answeredCount() === total;
  });

  readonly currentAnswer = computed<string>(() => {
    const active = this.activeChallenge();
    if (!active) return '';
    return this.answers()[active.id] ?? '';
  });

  readonly currentSaveStatus = computed<SaveState>(() => {
    const active = this.activeChallenge();
    if (!active) return 'idle';
    return this.saveStatuses()[active.id] ?? 'idle';
  });

  constructor() {
    this.autosaveSub = this.answerSubject$
      .pipe(
        debounceTime(700),
        distinctUntilChanged(
          (prev, curr) =>
            prev.challengeId === curr.challengeId && prev.answer === curr.answer
        ),
        switchMap(({ challengeId, answer }) =>
          this.executeSave(challengeId, answer)
        )
      )
      .subscribe();
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id || id === 'draft') {
      this.errorMessage.set('session.notFound');
      this.isLoading.set(false);
      return;
    }

    this.sessionId.set(id);
    this.loadSession(id);
  }

  ngOnDestroy(): void {
    this.flushCurrentSave();
    this.autosaveSub?.unsubscribe();
  }

  loadSession(id: string): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.sessionService
      .getSession(id)
      .pipe(
        finalize(() => {
          this.isLoading.set(false);
        })
      )
      .subscribe({
        next: (res) => {
          this.session.set(res);
          this.initializeAnswers(res);

          // If status is Generated, automatically start the session once
          if (res.status === 'Generated') {
            this.startSession(id);
          }
        },
        error: (err) => {
          console.error('Failed to load session', err);
          this.errorMessage.set('session.notFound');
        },
      });
  }

  private initializeAnswers(sessionData: LearningSessionResponse): void {
    const answersMap: Record<string, string> = {};
    const statusMap: Record<string, SaveState> = {};

    for (const challenge of sessionData.challenges || []) {
      const existingAnswer = challenge.answer || '';
      answersMap[challenge.id] = existingAnswer;
      statusMap[challenge.id] = existingAnswer.trim() ? 'saved' : 'idle';
    }

    this.answers.set(answersMap);
    this.saveStatuses.set(statusMap);
  }

  startSession(id: string): void {
    if (this.isStarting()) return;
    this.isStarting.set(true);

    this.sessionService
      .startSession(id)
      .pipe(
        finalize(() => {
          this.isStarting.set(false);
        })
      )
      .subscribe({
        next: (updated) => {
          this.session.set(updated);
        },
        error: (err) => {
          console.warn('Session start notification error:', err);
        },
      });
  }

  onAnswerInput(text: string): void {
    const current = this.activeChallenge();
    if (!current || this.isReadOnly()) return;

    const challengeId = current.id;

    // Update local state immediately
    const updatedAnswers = { ...this.answers(), [challengeId]: text };
    this.answers.set(updatedAnswers);

    // Update save state to saving
    const updatedStatus = { ...this.saveStatuses(), [challengeId]: 'saving' as SaveState };
    this.saveStatuses.set(updatedStatus);

    // Clear submission warning if user started typing
    this.submitWarning.set(null);

    // Emit to debounce stream
    this.answerSubject$.next({ challengeId, answer: text });
  }

  private executeSave(challengeId: string, answer: string) {
    const sessId = this.sessionId();
    const trimmed = answer.trim();

    if (!sessId || !challengeId) {
      return of(null);
    }

    // If answer was cleared or is empty, mark as idle locally
    if (!trimmed) {
      const updatedStatus = { ...this.saveStatuses(), [challengeId]: 'idle' as SaveState };
      this.saveStatuses.set(updatedStatus);
      return of(null);
    }

    return this.sessionService.saveAnswer(sessId, challengeId, trimmed).pipe(
      catchError((err) => {
        console.error(`Save failed for challenge ${challengeId}:`, err);
        const updatedStatus = { ...this.saveStatuses(), [challengeId]: 'error' as SaveState };
        this.saveStatuses.set(updatedStatus);
        return of(null);
      }),
      switchMap((res) => {
        if (res) {
          const updatedStatus = { ...this.saveStatuses(), [challengeId]: 'saved' as SaveState };
          this.saveStatuses.set(updatedStatus);
        }
        return of(res);
      })
    );
  }

  retrySave(): void {
    const current = this.activeChallenge();
    if (!current) return;
    const challengeId = current.id;
    const answer = this.answers()[challengeId] || '';

    const updatedStatus = { ...this.saveStatuses(), [challengeId]: 'saving' as SaveState };
    this.saveStatuses.set(updatedStatus);

    this.executeSave(challengeId, answer).subscribe();
  }

  private flushCurrentSave(): void {
    const current = this.activeChallenge();
    if (!current || this.isReadOnly()) return;
    const challengeId = current.id;
    const status = this.saveStatuses()[challengeId];

    if (status === 'saving') {
      const answer = this.answers()[challengeId] || '';
      this.executeSave(challengeId, answer).subscribe();
    }
  }

  selectChallenge(index: number): void {
    if (index === this.activeChallengeIndex()) return;
    this.flushCurrentSave();
    this.activeChallengeIndex.set(index);
    this.submitWarning.set(null);
  }

  prevChallenge(): void {
    if (this.isFirstChallenge()) return;
    this.flushCurrentSave();
    this.activeChallengeIndex.update((i) => Math.max(0, i - 1));
    this.submitWarning.set(null);
  }

  nextChallenge(): void {
    if (this.isLastChallenge()) return;
    this.flushCurrentSave();
    this.activeChallengeIndex.update((i) =>
      Math.min(this.totalChallenges() - 1, i + 1)
    );
    this.submitWarning.set(null);
  }

  isChallengeAnswered(challengeId: string): boolean {
    return !!this.answers()[challengeId]?.trim();
  }

  openSubmitModal(): void {
    this.flushCurrentSave();

    const unanswered = this.challenges()
      .filter((c) => !this.answers()[c.id]?.trim())
      .map((c) => c.order);

    if (unanswered.length > 0) {
      const listStr = unanswered.join(', ');
      this.submitWarning.set(listStr);
      return;
    }

    this.submitWarning.set(null);
    this.showSubmitModal.set(true);
  }

  closeSubmitModal(): void {
    this.showSubmitModal.set(false);
  }

  confirmSubmit(): void {
    const id = this.sessionId();
    if (!id || this.isSubmitting()) return;

    this.isSubmitting.set(true);

    this.sessionService
      .submitSession(id)
      .pipe(
        finalize(() => {
          this.isSubmitting.set(false);
        })
      )
      .subscribe({
        next: (updatedSession) => {
          this.session.set(updatedSession);
          this.showSubmitModal.set(false);
          this.submitWarning.set(null);
        },
        error: (err) => {
          console.error('Submission failed', err);
          this.showSubmitModal.set(false);
          const msg =
            err.error?.message ||
            'Submission failed. Please check that all challenges are answered.';
          this.submitWarning.set(msg);
        },
      });
  }
}
