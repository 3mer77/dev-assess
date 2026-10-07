using DevAssess.Api.Dtos.Assessment;
using DevAssess.Api.Models;

namespace DevAssess.Api.Interfaces.Assessment;

public interface ISessionPlanValidator
{
    IReadOnlyList<string> Validate(
     SessionPlan plan,
     AssessmentBudget budget);
}