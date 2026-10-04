import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  LearningSessionResponse,
  ChallengeAnswerResponse,
  SaveChallengeAnswerRequest,
} from './session.models';

@Injectable({
  providedIn: 'root',
})
export class SessionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/Sessions';

  /**
   * Triggers session creation based on user's learning profile.
   */
  createSession(): Observable<LearningSessionResponse> {
    return this.http.post<LearningSessionResponse>(this.baseUrl, {});
  }

  /**
   * Fetches an existing learning session and its challenges/answers.
   */
  getSession(id: string): Observable<LearningSessionResponse> {
    return this.http.get<LearningSessionResponse>(`${this.baseUrl}/${id}`);
  }

  /**
   * Starts a Generated session and transitions it to InProgress.
   */
  startSession(id: string): Observable<LearningSessionResponse> {
    return this.http.post<LearningSessionResponse>(`${this.baseUrl}/${id}/start`, {});
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
    return this.http.post<LearningSessionResponse>(`${this.baseUrl}/${id}/submit`, {});
  }
}
