import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthStore } from '../../../core/auth/auth.store';

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard-home.html',
  styleUrl: './dashboard-home.css',
})
export class DashboardHome {
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);

  readonly user = this.authStore.user;

  /**
   * Frontend-only sign out.
   *
   * TODO: When the backend implements refresh-token rotation,
   * call a server-side logout endpoint here to revoke the
   * refresh token before clearing local state.
   */
  signOut(): void {
    this.authStore.clearAuth();
    this.router.navigate(['/login']);
  }
}
