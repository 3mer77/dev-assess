import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  TranscriptionResponse,
  SupportedAudioType,
} from './transcription.models';

@Injectable({
  providedIn: 'root',
})
export class TranscriptionService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = '/api/Transcription';

  /**
   * Uploads an audio blob to the ASP.NET Core transcription endpoint.
   * Authentication is automatically attached via the Auth interceptor.
   */
  transcribeAudio(
    audioBlob: Blob,
    filename = 'recording.webm'
  ): Observable<TranscriptionResponse> {
    const formData = new FormData();
    formData.append('audio', audioBlob, filename);

    return this.http.post<TranscriptionResponse>(this.endpoint, formData);
  }

  /**
   * Determines if the current browser environment supports audio recording.
   */
  isRecordingSupported(): boolean {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return false;
    }

    return Boolean(
      navigator.mediaDevices &&
        typeof navigator.mediaDevices.getUserMedia === 'function' &&
        typeof window.MediaRecorder === 'function'
    );
  }

  /**
   * Selects the best supported audio MIME type and corresponding file extension
   * across Chrome, Firefox, Edge, Android Chrome, and Safari / iOS WebKit.
   */
  getBestSupportedAudioType(): SupportedAudioType {
    if (!this.isRecordingSupported()) {
      return { mimeType: '', extension: 'webm' };
    }

    const mimeCandidates: { mimeType: string; extension: string }[] = [
      { mimeType: 'audio/webm;codecs=opus', extension: 'webm' },
      { mimeType: 'audio/webm', extension: 'webm' },
      { mimeType: 'audio/mp4', extension: 'mp4' },
      { mimeType: 'audio/ogg;codecs=opus', extension: 'ogg' },
      { mimeType: 'audio/ogg', extension: 'ogg' },
      { mimeType: 'audio/wav', extension: 'wav' },
    ];

    if (typeof MediaRecorder.isTypeSupported === 'function') {
      for (const candidate of mimeCandidates) {
        if (MediaRecorder.isTypeSupported(candidate.mimeType)) {
          return candidate;
        }
      }
    }

    // Default fallback when isTypeSupported is unavailable or returns false
    return { mimeType: '', extension: 'webm' };
  }
}
