using DevAssess.Api.Models;

namespace DevAssess.Api.Interfaces.Assessment;

public interface IAssessmentBudgetService
{
    AssessmentBudget Calculate(int preferredSessionMinutes);
}