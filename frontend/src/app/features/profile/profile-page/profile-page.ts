import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthStore } from '../../../core/auth/auth.store';
import { ProfileStore } from '../../../core/profile/profile.store';
import { ProfileService } from '../../../core/profile/profile.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './profile-page.html',
  styleUrl: './profile-page.css',
})
export class ProfilePage implements OnInit {
  private readonly authStore = inject(AuthStore);
  private readonly profileStore = inject(ProfileStore);
  private readonly profileService = inject(ProfileService);
  readonly langService = inject(LanguageService);

  readonly user = this.authStore.user;
  readonly profile = this.profileStore.profile;

  ngOnInit(): void {
    if (!this.profile()) {
      this.profileService.getProfile().subscribe({
        next: (p) => {
          this.profileStore.setProfile(p);
        },
        error: (err) => {
          console.warn('Could not fetch learning profile', err);
        },
      });
    }
  }
}
