using DevAssess.Api.Dtos.Assessment;
using DevAssess.Api.Models;

namespace DevAssess.Api.Interfaces.Assessment;

public interface IAssessmentPlanner
{
    Task<SessionPlan> CreatePlanAsync(
    UserLearningProfile profile,
    AssessmentBudget budget,
    IReadOnlyList<SkillEvidenceSummary> skillEvidence,
    CancellationToken cancellationToken = default);
}