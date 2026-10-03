import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './core/theme/theme.service';
import { LanguageService } from './core/i18n/language.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet />',
  styles: ':host { display: block; }',
})
export class App {
  // Eagerly inject ThemeService and LanguageService on application boot
  private readonly themeService = inject(ThemeService);
  private readonly languageService = inject(LanguageService);
}

