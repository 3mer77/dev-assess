import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LanguageService } from '../../../core/i18n/language.service';
import { ThemeService, ThemePreference } from '../../../core/theme/theme.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe],
  templateUrl: './landing-page.html',
  styleUrl: './landing-page.css',
})
export class LandingPage {
  readonly langService = inject(LanguageService);
  readonly themeService = inject(ThemeService);

  toggleLanguage(): void {
    this.langService.toggleLanguage();
  }

  cycleTheme(): void {
    const current = this.themeService.preference();
    const next: ThemePreference = current === 'dark' ? 'light' : current === 'light' ? 'system' : 'dark';
    this.themeService.setPreference(next);
  }
}
