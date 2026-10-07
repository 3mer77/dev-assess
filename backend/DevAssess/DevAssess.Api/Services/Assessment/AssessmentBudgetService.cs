using DevAssess.Api.Interfaces.Assessment;
using DevAssess.Api.Models;

namespace DevAssess.Api.Services.Assessment;

public sealed class AssessmentBudgetService : IAssessmentBudgetService
{
    public AssessmentBudget Calculate(int preferredSessionMinutes)
    {
        return preferredSessionMinutes switch
        {
            <= 10 => new AssessmentBudget(
                DurationMinutes: preferredSessionMinutes,
                MinChallenges: 3,
                TargetChallenges: 4,
                MaxChallenges: 5),

            <= 20 => new AssessmentBudget(
                DurationMinutes: preferredSessionMinutes,
                MinChallenges: 4,
                TargetChallenges: 6,
                MaxChallenges: 7),

            <= 30 => new AssessmentBudget(
                DurationMinutes: preferredSessionMinutes,
                MinChallenges: 6,
                TargetChallenges: 8,
                MaxChallenges: 9),

            _ => new AssessmentBudget(
                DurationMinutes: preferredSessionMinutes,
                MinChallenges: 8,
                TargetChallenges: 10,
                MaxChallenges: 12)
        };
    }
}