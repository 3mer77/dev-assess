export type SupportedLanguage = 'en' | 'ar';
export type Direction = 'ltr' | 'rtl';

export interface TranslationDictionary {
  [key: string]: string;
}
