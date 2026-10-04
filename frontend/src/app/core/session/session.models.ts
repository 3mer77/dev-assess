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
  status: 'Generated' | 'InProgress' | 'Submitted' | 'Evaluating' | 'Completed' | string;
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
