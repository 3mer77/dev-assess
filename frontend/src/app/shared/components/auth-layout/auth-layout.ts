import { Component, input, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { LanguageService } from '../../../core/i18n/language.service';

export interface StepItem {
  label: string;
  status: 'completed' | 'active' | 'upcoming';
}

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe],
  templateUrl: './auth-layout.html',
  styleUrl: './auth-layout.css',
})
export class AuthLayout {
  readonly langService = inject(LanguageService);

  readonly headline = input<string>('Create your account in a few clicks');
  readonly subheadline = input<string>('');
  readonly steps = input<StepItem[]>([]);
  readonly userEmail = input<string | null | undefined>(null);
  readonly showLogout = input<boolean>(false);

  readonly logoutClicked = output<void>();

  setLanguage(lang: 'en' | 'ar'): void {
    this.langService.setLanguage(lang);
  }
}
