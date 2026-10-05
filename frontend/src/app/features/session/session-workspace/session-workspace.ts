import {
  Component,
  inject,
  signal,
  computed,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, Subscription, debounceTime, distinctUntilChanged, switchMap, finalize, of, catchError } from 'rxjs';
import { SessionService } from '../../../core/session/session.service';
import { SessionHistoryService } from '../../../core/session/session-history.service';
import {
  LearningSessionResponse,
  ChallengeResponse,
  AnswerEvaluation,
  ChallengeReview,
  SkillObservation,
  EvaluationSignal,
} from '../../../core/session/session.models';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

export type SaveState = 'saved' | 'saving' | 'error' | 'idle';

@Component({
  selector: 'app-session-workspace',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslatePipe, DatePipe],
  templateUrl: './session-workspace.html',
  styleUrl: './session-workspace.css',
})
export class SessionWorkspace implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly sessionService = inject(SessionService);
  private readonly historyService = inject(SessionHistoryService);
  readonly langService = inject(LanguageService);

  readonly sessionId = signal<string>('');
  readonly session = signal<LearningSessionResponse | null>(null);
  readonly evaluation = signal<AnswerEvaluation | null>(null);

  readonly isLoading = signal<boolean>(true);
  readonly isStarting = signal<boolean>(false);
  readonly isSubmitting = signal<boolean>(false);
  readonly isEvaluating = signal<boolean>(false);
  readonly evaluationError = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);

  readonly activeChallengeIndex = signal<number>(0);
  readonly activeResultIndex = signal<number>(0);

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

  readonly isCompleted = computed<boolean>(() => {
    return this.session()?.status === 'Completed' && !!this.evaluation();
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

  // All skill observations collected across challenge reviews
  readonly allSkillObservations = computed<SkillObservation[]>(() => {
    const ev = this.evaluation();
    if (!ev?.challengeReviews) return [];
    return ev.challengeReviews.flatMap((r) => r.observations || []);
  });

  readonly activeResultChallenge = computed<{
    challenge: ChallengeResponse | null;
    review: ChallengeReview | null;
  }>(() => {
    const list = this.challenges();
    const ev = this.evaluation();
    if (list.length === 0) return { challenge: null, review: null };

    const idx = this.activeResultIndex();
    const challenge = list[idx] ?? list[0];
    const review = ev?.challengeReviews?.find((r) => r.challengeId === challenge?.id) || null;

    return { challenge, review };
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
    this.evaluationError.set(null);

    this.sessionService.getSession(id).subscribe({
      next: (res) => {
        this.session.set(res);
        this.initializeAnswers(res);

        // Handle each status transition properly
        if (res.status === 'Generated') {
          this.isLoading.set(false);
          this.startSession(id);
        } else if (res.status === 'InProgress') {
          this.isLoading.set(false);
        } else if (res.status === 'Completed') {
          // Keep loading true while fetching evaluation so it doesn't flicker or show empty workspace
          this.fetchPersistedEvaluation(id);
        } else if (res.status === 'Submitted' || res.status === 'Evaluating') {
          this.isLoading.set(false);
          this.requestEvaluation(id);
        }
      },
      error: (err) => {
        console.error('Failed to load session', err);
        this.isLoading.set(false);
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
          console.warn('Session start error:', err);
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

  selectResultChallenge(index: number): void {
    this.activeResultIndex.set(index);
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

          // After submission succeeds, immediately trigger evaluation
          this.requestEvaluation(id);
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

  /**
   * Runs the real AI evaluation endpoint: POST /api/Sessions/{id}/evaluate
   */
  requestEvaluation(id: string): void {
    this.isEvaluating.set(true);
    this.evaluationError.set(null);

    this.sessionService
      .evaluateSession(id)
      .pipe(
        finalize(() => {
          this.isLoading.set(false);
          this.isEvaluating.set(false);
        })
      )
      .subscribe({
        next: (evalResult) => {
          this.evaluation.set(evalResult);

          // Update local session status to Completed
          const current = this.session();
          if (current) {
            const completedSession: LearningSessionResponse = {
              ...current,
              status: 'Completed',
              completedAt: current.completedAt || new Date().toISOString(),
            };
            this.session.set(completedSession);
            this.historyService.recordSession(completedSession);
          }
        },
        error: (err) => {
          console.error('Evaluation request failed', err);
          const msg =
            err.error?.message ||
            'evaluation.evaluationFailed';
          this.evaluationError.set(msg);
        },
      });
  }

  /**
   * Fetches the evaluation for a Completed session
   */
  fetchPersistedEvaluation(id: string): void {
    this.isEvaluating.set(true);
    this.evaluationError.set(null);

    this.sessionService
      .getEvaluation(id)
      .pipe(
        finalize(() => {
          this.isLoading.set(false);
          this.isEvaluating.set(false);
        })
      )
      .subscribe({
        next: (evalResult) => {
          this.evaluation.set(evalResult);
        },
        error: (err) => {
          console.error('Failed to load evaluation', err);
          this.evaluationError.set('evaluation.evaluationFailed');
        },
      });
  }

  retryEvaluation(): void {
    const id = this.sessionId();
    if (id) {
      this.requestEvaluation(id);
    }
  }

  startNewSession(): void {
    this.router.navigate(['/dashboard']);
  }

  getSignalBadgeClass(signal: EvaluationSignal): string {
    switch (signal) {
      case 'positive':
        return 'signal-positive';
      case 'negative':
        return 'signal-negative';
      case 'mixed':
        return 'signal-mixed';
      case 'insufficient':
      default:
        return 'signal-insufficient';
    }
  }

  getSignalLabelKey(signal: EvaluationSignal): string {
    switch (signal) {
      case 'positive':
        return 'evaluation.signalPositive';
      case 'negative':
        return 'evaluation.signalNegative';
      case 'mixed':
        return 'evaluation.signalMixed';
      case 'insufficient':
      default:
        return 'evaluation.signalInsufficient';
    }
  }

  getSignalIcon(signal: EvaluationSignal): string {
    switch (signal) {
      case 'positive':
        return '✓';
      case 'negative':
        return '✕';
      case 'mixed':
        return '~';
      case 'insufficient':
      default:
        return '○';
    }
  }
}
