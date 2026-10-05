using DevAssess.Api.Dtos.Evaluation;
using DevAssess.Api.Models;

namespace DevAssess.Api.Interfaces.Assessment;

public interface IAnswerReviewer
{
    Task<AnswerEvaluation> ReviewSessionAsync(
        UserLearningProfile profile,
        LearningSession session,
        CancellationToken cancellationToken = default);
}