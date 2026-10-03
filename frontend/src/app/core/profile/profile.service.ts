import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, of, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LearningProfile, OnboardingRequest } from './profile.models';

export interface ProfileResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/Profile`;

  getProfile(): Observable<LearningProfile | null> {
    return this.http
      .get<LearningProfile>(`${this.baseUrl}/GetProfile`, { withCredentials: true })
      .pipe(
        catchError((err: HttpErrorResponse) => {
          if (err.status === 404) {
            return of(null);
          }
          return of(null);
        })
      );
  }

  completeOnboarding(request: OnboardingRequest): Observable<ProfileResult<LearningProfile>> {
    return this.http
      .post<LearningProfile>(`${this.baseUrl}/onboarding`, request, { withCredentials: true })
      .pipe(
        map((profile) => ({ success: true, data: profile })),
        catchError((err: HttpErrorResponse) => {
          const message = err.error?.message || 'Failed to complete onboarding. Please try again.';
          return of({ success: false, error: message });
        })
      );
  }
}
