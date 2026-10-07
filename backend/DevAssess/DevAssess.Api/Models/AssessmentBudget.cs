namespace DevAssess.Api.Models;

public sealed record AssessmentBudget(
    int DurationMinutes,
    int MinChallenges,
    int TargetChallenges,
    int MaxChallenges
);