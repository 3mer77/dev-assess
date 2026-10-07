import { Component, input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import {
  PromptSegment,
  parsePromptSegments,
} from './prompt-renderer.models';

@Component({
  selector: 'app-prompt-renderer',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './prompt-renderer.html',
  styleUrl: './prompt-renderer.css',
})
export class PromptRenderer {
  /**
   * The raw challenge prompt string from the API.
   */
  readonly prompt = input<string>('');

  /**
   * Parsed text and fenced code segments.
   */
  readonly segments = computed<PromptSegment[]>(() => {
    return parsePromptSegments(this.prompt() || '');
  });

  /**
   * Tracks which code block index was recently copied for visual feedback.
   */
  readonly copiedIndex = signal<number | null>(null);

  /**
   * Copies the raw code snippet to the user's clipboard and provides visual feedback.
   */
  async copyCode(code: string, index: number): Promise<void> {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        // Fallback for non-secure / older browser contexts
        const textarea = document.createElement('textarea');
        textarea.value = code;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        textarea.style.pointerEvents = 'none';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }

      this.copiedIndex.set(index);

      setTimeout(() => {
        if (this.copiedIndex() === index) {
          this.copiedIndex.set(null);
        }
      }, 2000);
    } catch (err) {
      console.warn('Failed to copy code snippet to clipboard', err);
    }
  }
}
