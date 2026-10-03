import { Injectable, signal, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type ThemePreference = 'system' | 'light' | 'dark';
export type EffectiveTheme = 'light' | 'dark';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly storageKey = 'devassess_theme';

  readonly preference = signal<ThemePreference>(this.getInitialPreference());
  readonly effectiveTheme = signal<EffectiveTheme>('light');

  constructor() {
    if (this.isBrowser) {
      this.applyTheme(this.preference());

      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', () => {
        if (this.preference() === 'system') {
          this.applyTheme('system');
        }
      });
    }
  }

  setPreference(preference: ThemePreference): void {
    this.preference.set(preference);
    if (this.isBrowser) {
      try {
        localStorage.setItem(this.storageKey, preference);
      } catch (err) {
        console.warn('Unable to persist theme preference', err);
      }
      this.applyTheme(preference);
    }
  }

  private getInitialPreference(): ThemePreference {
    if (!this.isBrowser) return 'system';
    try {
      const stored = localStorage.getItem(this.storageKey) as ThemePreference;
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        return stored;
      }
    } catch {
      // Fallback to system default
    }
    return 'system';
  }

  private applyTheme(pref: ThemePreference): void {
    if (!this.isBrowser) return;

    let effective: EffectiveTheme = 'light';
    if (pref === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      effective = prefersDark ? 'dark' : 'light';
    } else {
      effective = pref;
    }

    this.effectiveTheme.set(effective);
    document.documentElement.dataset['theme'] = effective;
  }
}
