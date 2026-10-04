using DevAssess.Api.Dtos.Assessment;

namespace DevAssess.Api.Interfaces.Assessment;

public interface ISessionPlanValidator
{
    IReadOnlyList<string> Validate(SessionPlan plan);
}