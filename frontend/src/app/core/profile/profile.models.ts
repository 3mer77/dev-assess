export interface OnboardingRequest {
  targetRole: string;
  background: string;
  goal: string;
  preferredSessionMinutes: number; // Must be 10, 20, or 40 to match backend
}

export interface LearningProfile {
  targetRole: string;
  background: string;
  goal: string;
  preferredSessionMinutes: number;
  onboardingCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}
