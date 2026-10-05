using DevAssess.Api.Dtos.Evaluation;
using DevAssess.Api.Models;

namespace DevAssess.Api.Interfaces.Assessment;

public interface IAnswerEvaluationValidator
{
    IReadOnlyList<string> Validate(
        AnswerEvaluation evaluation,
        LearningSession session);
}