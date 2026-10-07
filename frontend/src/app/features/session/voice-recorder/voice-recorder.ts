import {
  Component,
  inject,
  signal,
  computed,
  input,
  output,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import {
  TranscriptionService,
} from '../../../core/transcription/transcription.service';
import { VoiceState } from '../../../core/transcription/transcription.models';

@Component({
  selector: 'app-voice-recorder',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './voice-recorder.html',
  styleUrl: './voice-recorder.css',
})
export class VoiceRecorder implements OnDestroy {
  private readonly transcriptionService = inject(TranscriptionService);

  /**
   * Disabled state (e.g. read-only session mode).
   */
  readonly disabled = input<boolean>(false);

  /**
   * Current answer text in the parent workspace prior to recording.
   */
  readonly currentAnswer = input<string>('');

  /**
   * Emitted when a new transcribed answer is ready to be set in the workspace.
   */
  readonly answerChange = output<string>();

  /**
   * Emitted whenever the voice recording state changes.
   */
  readonly stateChange = output<VoiceState>();

  /**
   * Current voice lifecycle state.
   */
  readonly state = signal<VoiceState>('idle');

  /**
   * Elapsed time in seconds during the active recording.
   */
  readonly elapsedSeconds = signal<number>(0);

  /**
   * Formatted MM:SS elapsed time string.
   */
  readonly formattedTimer = computed<string>(() => {
    const total = this.elapsedSeconds();
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  });

  /**
   * Localized error message key if an error occurs.
   */
  readonly errorMessage = signal<string | null>(null);

  /**
   * Temporary success banner shown after successful transcription.
   */
  readonly successFeedback = signal<boolean>(false);

  // Audio recording internal state
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private successTimeout: ReturnType<typeof setTimeout> | null = null;

  // Maximum limits
  private readonly MAX_RECORDING_SECONDS = 300; // 5 minutes max
  private readonly MAX_BLOB_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

  ngOnDestroy(): void {
    this.cancel();
    if (this.successTimeout) {
      clearTimeout(this.successTimeout);
    }
  }

  /**
   * Starts requesting microphone permissions and begins recording.
   */
  async startRecording(): Promise<void> {
    if (this.disabled() || this.state() === 'recording' || this.state() === 'transcribing') {
      return;
    }

    this.errorMessage.set(null);
    this.successFeedback.set(false);

    if (!this.transcriptionService.isRecordingSupported()) {
      this.setErrorState('voice.notSupported');
      return;
    }

    this.setState('requesting-permission');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaStream = stream;
      this.beginMediaRecorder(stream);
    } catch (err: unknown) {
      this.cleanupMediaTracks();
      const errorObj = err as { name?: string };
      if (
        errorObj?.name === 'NotAllowedError' ||
        errorObj?.name === 'PermissionDeniedError'
      ) {
        this.setErrorState('voice.permissionDenied');
      } else {
        this.setErrorState('voice.notSupported');
      }
    }
  }

  private beginMediaRecorder(stream: MediaStream): void {
    const audioType = this.transcriptionService.getBestSupportedAudioType();
    const options: MediaRecorderOptions = {};

    if (audioType.mimeType && typeof MediaRecorder.isTypeSupported === 'function') {
      if (MediaRecorder.isTypeSupported(audioType.mimeType)) {
        options.mimeType = audioType.mimeType;
      }
    }

    try {
      this.audioChunks = [];
      const recorder = options.mimeType
        ? new MediaRecorder(stream, options)
        : new MediaRecorder(stream);

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      recorder.onerror = (event: Event) => {
        console.error('MediaRecorder error', event);
        this.setErrorState('voice.transcriptionFailed');
      };

      this.mediaRecorder = recorder;
      recorder.start(500); // Collect slice every 500ms

      this.elapsedSeconds.set(0);
      this.setState('recording');
      this.startTimer();
    } catch (err) {
      console.error('Failed to initialize MediaRecorder', err);
      this.cleanupMediaTracks();
      this.setErrorState('voice.notSupported');
    }
  }

  private startTimer(): void {
    this.stopTimer();
    this.timerInterval = setInterval(() => {
      const next = this.elapsedSeconds() + 1;
      this.elapsedSeconds.set(next);

      if (next >= this.MAX_RECORDING_SECONDS) {
        this.finishRecording();
      }
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  /**
   * Completes the recording, stops audio streams, and posts audio for transcription.
   */
  finishRecording(): void {
    if (this.state() !== 'recording') return;

    this.stopTimer();
    this.setState('transcribing');

    const recorder = this.mediaRecorder;
    if (recorder && recorder.state !== 'inactive') {
      recorder.onstop = () => {
        this.cleanupMediaTracks();
        this.processAudioBlob();
      };
      recorder.stop();
    } else {
      this.cleanupMediaTracks();
      this.processAudioBlob();
    }
  }

  private processAudioBlob(): void {
    const audioType = this.transcriptionService.getBestSupportedAudioType();
    const mime =
      audioType.mimeType || this.audioChunks[0]?.type || 'audio/webm';
    const audioBlob = new Blob(this.audioChunks, { type: mime });
    this.audioChunks = [];

    // Size limit verification (10 MB backend ceiling)
    if (audioBlob.size > this.MAX_BLOB_SIZE_BYTES) {
      this.setErrorState('voice.fileTooLarge');
      return;
    }

    if (audioBlob.size === 0) {
      this.setState('idle');
      return;
    }

    const filename = `recording_${Date.now()}.${audioType.extension || 'webm'}`;

    this.transcriptionService.transcribeAudio(audioBlob, filename).subscribe({
      next: (res) => {
        const transcript = res?.text?.trim() || '';
        if (transcript) {
          const prev = this.currentAnswer();
          const newAnswer = prev.trim()
            ? `${prev.trim()}\n\n${transcript}`
            : transcript;

          this.answerChange.emit(newAnswer);

          this.successFeedback.set(true);
          if (this.successTimeout) {
            clearTimeout(this.successTimeout);
          }
          this.successTimeout = setTimeout(() => {
            this.successFeedback.set(false);
          }, 4000);
        }

        this.setState('idle');
      },
      error: (err) => {
        console.error('Transcription API request failed', err);
        this.setErrorState('voice.transcriptionFailed');
      },
    });
  }

  /**
   * Cancels the active recording and preserves the previous answer.
   */
  cancel(): void {
    this.stopTimer();

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.onstop = null;
      try {
        this.mediaRecorder.stop();
      } catch {
        // Ignore stop errors on cancellation
      }
    }

    this.cleanupMediaTracks();
    this.audioChunks = [];
    this.mediaRecorder = null;

    if (this.state() !== 'idle') {
      this.setState('idle');
    }
  }

  dismissError(): void {
    this.errorMessage.set(null);
    if (this.state() === 'error') {
      this.setState('idle');
    }
  }

  private cleanupMediaTracks(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // Ignore track stop errors
        }
      });
      this.mediaStream = null;
    }
  }

  private setState(newState: VoiceState): void {
    this.state.set(newState);
    this.stateChange.emit(newState);
  }

  private setErrorState(errorKey: string): void {
    this.cleanupMediaTracks();
    this.stopTimer();
    this.errorMessage.set(errorKey);
    this.setState('error');
  }
}
