import { Injectable, signal, computed, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { SupportedLanguage, Direction, TranslationDictionary } from './translation.types';
import { en } from './translations/en';
import { ar } from './translations/ar';

@Injectable({
  providedIn: 'root',
})
export class LanguageService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly storageKey = 'devassess_lang';

  private readonly dictionaries: Record<SupportedLanguage, TranslationDictionary> = {
    en,
    ar,
  };

  readonly currentLanguage = signal<SupportedLanguage>(this.getInitialLanguage());
  readonly direction = computed<Direction>(() => (this.currentLanguage() === 'ar' ? 'rtl' : 'ltr'));

  constructor() {
    if (this.isBrowser) {
      this.applyDocumentAttributes(this.currentLanguage(), this.direction());
    }
  }

  setLanguage(lang: SupportedLanguage): void {
    if (lang !== 'en' && lang !== 'ar') return;
    this.currentLanguage.set(lang);
    const dir = lang === 'ar' ? 'rtl' : 'ltr';

    if (this.isBrowser) {
      try {
        localStorage.setItem(this.storageKey, lang);
      } catch (err) {
        console.warn('Unable to persist language preference', err);
      }
      this.applyDocumentAttributes(lang, dir);
    }
  }

  toggleLanguage(): void {
    const nextLang: SupportedLanguage = this.currentLanguage() === 'en' ? 'ar' : 'en';
    this.setLanguage(nextLang);
  }

  t(key: string, params?: Record<string, string | number | boolean | null | undefined>): string {
    const lang = this.currentLanguage();
    const dict = this.dictionaries[lang] || this.dictionaries.en;
    let translation = dict[key] ?? this.dictionaries.en[key] ?? key;

    if (params) {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        translation = translation.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue ?? ''));
      });
    }

    return translation;
  }

  private getInitialLanguage(): SupportedLanguage {
    if (!this.isBrowser) return 'en';
    try {
      const stored = localStorage.getItem(this.storageKey) as SupportedLanguage;
      if (stored === 'en' || stored === 'ar') {
        return stored;
      }
    } catch {
      // Fallback
    }
    return 'en';
  }

  private applyDocumentAttributes(lang: SupportedLanguage, dir: Direction): void {
    if (!this.isBrowser) return;
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }
}
