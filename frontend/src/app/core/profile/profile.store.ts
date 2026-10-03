import { Injectable, computed, signal } from '@angular/core';
import { LearningProfile } from './profile.models';

const PROFILE_KEY = 'devassess_learning_profile';

@Injectable({ providedIn: 'root' })
export class ProfileStore {
  private readonly _profile = signal<LearningProfile | null>(this.loadProfile());
  private readonly _loading = signal<boolean>(false);

  readonly profile = this._profile.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly hasCompletedOnboarding = computed(
    () => !!this._profile()?.onboardingCompleted
  );

  setProfile(profile: LearningProfile | null): void {
    this._profile.set(profile);
    this.saveProfile(profile);
  }

  setLoading(loading: boolean): void {
    this._loading.set(loading);
  }

  clearProfile(): void {
    this._profile.set(null);
    this.removeProfile();
  }

  private loadProfile(): LearningProfile | null {
    try {
      const raw = sessionStorage.getItem(PROFILE_KEY);
      return raw ? (JSON.parse(raw) as LearningProfile) : null;
    } catch {
      return null;
    }
  }

  private saveProfile(profile: LearningProfile | null): void {
    try {
      if (profile) {
        sessionStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
      } else {
        sessionStorage.removeItem(PROFILE_KEY);
      }
    } catch { /* noop */ }
  }

  private removeProfile(): void {
    try {
      sessionStorage.removeItem(PROFILE_KEY);
    } catch { /* noop */ }
  }
}
