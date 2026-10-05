import { Injectable, inject, signal, effect } from '@angular/core';
import { LearningSessionResponse, SessionStatus } from './session.models';
import { AuthStore } from '../auth/auth.store';

export interface SessionHistoryItem {
  id: string;
  title: string;
  goal: string;
  status: SessionStatus;
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  challengesCount: number;
}

@Injectable({
  providedIn: 'root',
})
export class SessionHistoryService {
  private readonly authStore = inject(AuthStore);
  private readonly storageKeyPrefix = 'devassess_history_';

  readonly sessions = signal<SessionHistoryItem[]>([]);

  constructor() {
    this.loadFromStorage();

    // Reactively reload if auth user state resolves/changes
    effect(() => {
      this.authStore.user();
      this.loadFromStorage();
    });
  }

  private getStorageKey(): string {
    const user = this.authStore.user();
    const userId = user?.id || user?.email || 'default_user';
    return `${this.storageKeyPrefix}${userId}`;
  }

  loadFromStorage(): void {
    const map = new Map<string, SessionHistoryItem>();

    try {
      // 1. Load from specific user key
      const currentKey = this.getStorageKey();
      const rawCurrent = localStorage.getItem(currentKey);
      if (rawCurrent) {
        const parsed = JSON.parse(rawCurrent) as SessionHistoryItem[];
        if (Array.isArray(parsed)) {
          parsed.forEach((item) => {
            if (item && item.id) map.set(item.id, item);
          });
        }
      }

      // 2. Also check fallback / default_user key to not lose any previously started sessions
      const defaultRaw = localStorage.getItem(`${this.storageKeyPrefix}default_user`);
      if (defaultRaw) {
        const parsedDefault = JSON.parse(defaultRaw) as SessionHistoryItem[];
        if (Array.isArray(parsedDefault)) {
          parsedDefault.forEach((item) => {
            if (item && item.id && !map.has(item.id)) {
              map.set(item.id, item);
            }
          });
        }
      }

      // 3. Convert to array and sort descending by completion or creation date
      const list = Array.from(map.values());
      list.sort((a, b) => {
        const dateA = new Date(a.completedAt || a.createdAt).getTime();
        const dateB = new Date(b.completedAt || b.createdAt).getTime();
        return dateB - dateA;
      });

      this.sessions.set(list);
    } catch (e) {
      console.warn('Failed to load session history from storage', e);
      this.sessions.set([]);
    }
  }

  recordSession(session: LearningSessionResponse): void {
    if (!session || !session.id) return;

    const currentList = this.sessions();
    const existingIdx = currentList.findIndex((item) => item.id === session.id);

    const historyItem: SessionHistoryItem = {
      id: session.id,
      title: session.title,
      goal: session.goal,
      status: session.status,
      createdAt: session.createdAt,
      startedAt: session.startedAt,
      completedAt: session.completedAt,
      challengesCount: session.challenges?.length || 0,
    };

    let updated: SessionHistoryItem[];
    if (existingIdx >= 0) {
      updated = [...currentList];
      updated[existingIdx] = { ...updated[existingIdx], ...historyItem };
    } else {
      updated = [historyItem, ...currentList];
    }

    updated.sort((a, b) => {
      const dateA = new Date(a.completedAt || a.createdAt).getTime();
      const dateB = new Date(b.completedAt || b.createdAt).getTime();
      return dateB - dateA;
    });

    this.sessions.set(updated);
    this.persist(updated);
  }

  private persist(list: SessionHistoryItem[]): void {
    try {
      const key = this.getStorageKey();
      localStorage.setItem(key, JSON.stringify(list));
      // Also sync to default_user key as fallback
      localStorage.setItem(`${this.storageKeyPrefix}default_user`, JSON.stringify(list));
    } catch (e) {
      console.warn('Failed to persist session history to localStorage', e);
    }
  }
}
