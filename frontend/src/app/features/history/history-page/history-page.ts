import { Component, inject, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { SessionHistoryService, SessionHistoryItem } from '../../../core/session/session-history.service';

@Component({
  selector: 'app-history-page',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe, DatePipe],
  templateUrl: './history-page.html',
  styleUrl: './history-page.css',
})
export class HistoryPage {
  private readonly historyService = inject(SessionHistoryService);

  readonly sessions = computed<SessionHistoryItem[]>(() => {
    return this.historyService.sessions();
  });

  readonly hasSessions = computed<boolean>(() => {
    return this.sessions().length > 0;
  });

  getStatusClass(status: string): string {
    switch (status) {
      case 'Completed':
        return 'badge-success';
      case 'InProgress':
        return 'badge-accent';
      case 'Submitted':
      case 'Evaluating':
        return 'badge-warning';
      default:
        return 'badge-default';
    }
  }

  getStatusLabelKey(status: string): string {
    switch (status) {
      case 'Completed':
        return 'session.statusCompleted';
      case 'InProgress':
        return 'session.statusInProgress';
      case 'Submitted':
        return 'session.statusSubmitted';
      case 'Evaluating':
        return 'session.statusEvaluating';
      case 'Generated':
      default:
        return 'session.statusGenerated';
    }
  }
}
