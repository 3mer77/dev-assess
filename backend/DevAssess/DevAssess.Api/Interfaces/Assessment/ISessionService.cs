using DevAssess.Api.Dtos.Session;

namespace DevAssess.Api.Interfaces.Assessment;

public interface ISessionService
{
    Task<LearningSessionResponse> CreateSessionAsync(string userId , CancellationToken cancellationToken = default);

    Task<LearningSessionResponse?> GetSessionAsync(string userId,Guid sessionId,CancellationToken cancellationToken = default);

    Task<LearningSessionResponse?> StartSessionAsync(string userId,Guid sessionId,CancellationToken cancellationToken = default);

    Task<ChallengeAnswerResponse?> SaveAnswerAsync(string userId,Guid sessionId,Guid challengeId,SaveChallengeAnswerRequest request,CancellationToken cancellationToken = default);

    Task<LearningSessionResponse?> SubmitSessionAsync( string userId,Guid sessionId,CancellationToken cancellationToken = default);


}