import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import {
  LearningSessionResponse,
  ChallengeAnswerResponse,
  SaveChallengeAnswerRequest,
  AnswerEvaluation,
} from './session.models';
import { SessionHistoryService } from './session-history.service';

@Injectable({
  providedIn: 'root',
})
export class SessionService {
  private readonly http = inject(HttpClient);
  private readonly historyService = inject(SessionHistoryService);
  private readonly baseUrl = '/api/Sessions';

  /**
   * Triggers session creation based on user's learning profile.
   */
  createSession(): Observable<LearningSessionResponse> {
    return this.http.post<LearningSessionResponse>(this.baseUrl, {}).pipe(
      tap((session) => {
        this.historyService.recordSession(session);
      })
    );
  }

  /**
   * Fetches an existing learning session and its challenges/answers.
   */
  getSession(id: string): Observable<LearningSessionResponse> {
    return this.http.get<LearningSessionResponse>(`${this.baseUrl}/${id}`).pipe(
      tap((session) => {
        this.historyService.recordSession(session);
      })
    );
  }

  /**
   * Starts a Generated session and transitions it to InProgress.
   */
  startSession(id: string): Observable<LearningSessionResponse> {
    return this.http
      .post<LearningSessionResponse>(`${this.baseUrl}/${id}/start`, {})
      .pipe(
        tap((session) => {
          this.historyService.recordSession(session);
        })
      );
  }

  /**
   * Persists the user's answer to a specific challenge.
   */
  saveAnswer(
    sessionId: string,
    challengeId: string,
    answer: string
  ): Observable<ChallengeAnswerResponse> {
    const payload: SaveChallengeAnswerRequest = { answer };
    return this.http.put<ChallengeAnswerResponse>(
      `${this.baseUrl}/${sessionId}/challenges/${challengeId}/answer`,
      payload
    );
  }

  /**
   * Submits the entire session after all challenges are answered.
   */
  submitSession(id: string): Observable<LearningSessionResponse> {
    return this.http
      .post<LearningSessionResponse>(`${this.baseUrl}/${id}/submit`, {})
      .pipe(
        tap((session) => {
          this.historyService.recordSession(session);
        })
      );
  }

  /**
   * Requests real AI evaluation for a Submitted or Completed session.
   * If session is Completed, backend immediately returns the saved evaluation from SQL.
   */
  evaluateSession(id: string): Observable<AnswerEvaluation> {
    return this.http.post<AnswerEvaluation>(`${this.baseUrl}/${id}/evaluate`, {});
  }

  /**
   * Fetches the evaluation for a session.
   * Calls POST /api/Sessions/{id}/evaluate which reads the persisted evaluation from SQL.
   */
  getEvaluation(id: string): Observable<AnswerEvaluation> {
    return this.evaluateSession(id);
  }
}
