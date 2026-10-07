export interface TranscriptionResponse {
  text: string;
}

export type VoiceState =
  | 'idle'
  | 'requesting-permission'
  | 'recording'
  | 'transcribing'
  | 'error';

export interface SupportedAudioType {
  mimeType: string;
  extension: string;
}
