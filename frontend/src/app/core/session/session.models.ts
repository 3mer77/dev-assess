export type SessionStatus =
  | 'Generated'
  | 'InProgress'
  | 'Submitted'
  | 'Evaluating'
  | 'Completed';

export type EvaluationSignal =
  | 'positive'
  | 'negative'
  | 'mixed'
  | 'insufficient';

export interface SkillObservation {
  skill: string;
  signal: EvaluationSignal;
  confidence: number;
  evidence: string;
}

export interface ChallengeReview {
  challengeId: string;
  summary: string;
  strengths: string[];
  gaps: string[];
  observations: SkillObservation[];
}

export interface AnswerEvaluation {
  summary: string;
  nextFocus: string;
  challengeReviews: ChallengeReview[];
}

export interface ChallengeResponse {
  id: string;
  type: string;
  title: string;
  prompt: string;
  difficulty: string;
  order: number;
  answer?: string | null;
  answerUpdatedAt?: string | null;
}

export interface LearningSessionResponse {
  id: string;
  title: string;
  goal: string;
  status: SessionStatus;
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  challenges: ChallengeResponse[];
}

export interface ChallengeAnswerResponse {
  challengeId: string;
  answer: string;
  updatedAt: string;
}

export interface SaveChallengeAnswerRequest {
  answer: string;
}

