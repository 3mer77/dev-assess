using DevAssess.Api.Dtos.Evaluation;

namespace DevAssess.Api.Interfaces.Assessment;

public interface IEvaluationService
{
    Task<AnswerEvaluation?> EvaluateSessionAsync(
        string userId,
        Guid sessionId,
        CancellationToken cancellationToken = default);

    Task<AnswerEvaluation?> GetEvaluationAsync(
    string userId,
    Guid sessionId,
    CancellationToken cancellationToken = default);
}