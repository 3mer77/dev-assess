import { Pipe, PipeTransform, inject } from '@angular/core';
import { LanguageService } from './language.service';

@Pipe({
  name: 'translate',
  standalone: true,
  pure: false, // Ensures immediate re-evaluation when language signal changes
})
export class TranslatePipe implements PipeTransform {
  private readonly languageService = inject(LanguageService);

  transform(key: string, params?: Record<string, string | number | boolean | null | undefined>): string {
    // Read signal to register dependency
    this.languageService.currentLanguage();
    return this.languageService.t(key, params);
  }
}
