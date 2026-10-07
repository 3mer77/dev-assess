using System.Text.Json;
using DevAssess.Api.Data;
using DevAssess.Api.Dtos.Session;
using DevAssess.Api.Interfaces.Assessment;
using DevAssess.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace DevAssess.Api.Services.Assessment;

public class SessionService : ISessionService
{
    private readonly AppDbContext _dbContext;
    private readonly IAssessmentPlanner _assessmentPlanner;
    private readonly ISessionPlanValidator _sessionPlanValidator;

    private readonly IAssessmentBudgetService _assessmentBudgetService;

    private readonly ISkillEvidenceSummaryService _skillEvidenceSummaryService;

    public SessionService(
        AppDbContext dbContext,
        IAssessmentPlanner assessmentPlanner,
        ISessionPlanValidator sessionPlanValidator,
        IAssessmentBudgetService assessmentBudgetService,
        ISkillEvidenceSummaryService skillEvidenceSummaryService)
    {
        _dbContext = dbContext;
        _assessmentPlanner = assessmentPlanner;
        _sessionPlanValidator = sessionPlanValidator;
        _assessmentBudgetService = assessmentBudgetService;
        _skillEvidenceSummaryService = skillEvidenceSummaryService;
    }

    public async Task<LearningSessionResponse> CreateSessionAsync(string userId,CancellationToken cancellationToken = default)
    {
        var profile = await _dbContext.UserLearningProfiles
            .AsNoTracking()
            .SingleOrDefaultAsync(
                profile => profile.UserId == userId,
                cancellationToken);

        if (profile is null || !profile.OnboardingCompleted)
        {
            throw new InvalidOperationException(
                "Complete onboarding before creating a session.");
        }

        var budget =
    _assessmentBudgetService.Calculate(
        profile.PreferredSessionMinutes);

        var skillEvidenceSummaries =
    await _skillEvidenceSummaryService.GetForUserAsync(
        userId,
        cancellationToken);

        var plan = await _assessmentPlanner.CreatePlanAsync(
     profile,
     budget,
     skillEvidenceSummaries,
     cancellationToken);

        var validationErrors =
    _sessionPlanValidator.Validate(
        plan,
        budget);

        if (validationErrors.Count > 0)
        {
            throw new InvalidOperationException(
                $"AI generated an invalid session plan: {string.Join(" | ", validationErrors)}");
        }

        var session = new LearningSession
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Title = plan.Title.Trim(),
            Goal = plan.Goal.Trim(),
            Status = "Generated",
            CreatedAt = DateTime.UtcNow
        };

        foreach (var plannedChallenge in plan.Challenges
                     .OrderBy(challenge => challenge.Order))
        {
            var challenge = new Challenge
            {
                Id = Guid.NewGuid(),
                LearningSessionId = session.Id,
                Type = plannedChallenge.Type,
                Title = plannedChallenge.Title.Trim(),
                Prompt = plannedChallenge.Prompt.Trim(),
                Difficulty = plannedChallenge.Difficulty,
                Order = plannedChallenge.Order,

                ExpectedEvidenceJson =
                    JsonSerializer.Serialize(
                        plannedChallenge.ExpectedEvidence)
            };

            session.Challenges.Add(challenge);
        }

        _dbContext.LearningSessions.Add(session);

        await _dbContext.SaveChangesAsync(cancellationToken);

        return MapToResponse(session);
    }

    public async Task<LearningSessionResponse?> GetSessionAsync(string userId,Guid sessionId,CancellationToken cancellationToken = default)
    {
        var session = await _dbContext.LearningSessions
            .AsNoTracking()
            .Include(session => session.Challenges)
            .ThenInclude(challenge => challenge.Answer)
            .SingleOrDefaultAsync(
                session =>
                    session.Id == sessionId &&
                    session.UserId == userId,
                cancellationToken);

        if (session is null)
        {
            return null;
        }

        return MapToResponse(session);
    }

    private static LearningSessionResponse MapToResponse(
        LearningSession session)
    {
        return new LearningSessionResponse
        {
            Id = session.Id,
            Title = session.Title,
            Goal = session.Goal,
            Status = session.Status,
            CreatedAt = session.CreatedAt,
            StartedAt = session.StartedAt,
            CompletedAt = session.CompletedAt,

            Challenges = session.Challenges
                .OrderBy(challenge => challenge.Order)
                .Select(challenge => new ChallengeResponse
                {
                    Id = challenge.Id,
                    Type = challenge.Type,
                    Title = challenge.Title,
                    Prompt = challenge.Prompt,
                    Difficulty = challenge.Difficulty,
                    Order = challenge.Order
                })
                .ToList()
        };
    }

    public async Task<LearningSessionResponse?> StartSessionAsync(string userId,Guid sessionId,CancellationToken cancellationToken = default)
    {
        var session = await _dbContext.LearningSessions
            .Include(session => session.Challenges)
            .SingleOrDefaultAsync(
                session =>
                    session.Id == sessionId &&
                    session.UserId == userId,
                cancellationToken);

        if (session is null)
        {
            return null;
        }

        if (session.Status == "Completed")
        {
            throw new InvalidOperationException(
                "A completed session cannot be started again.");
        }

        if (session.Status == "Generated")
        {
            session.Status = "InProgress";
            session.StartedAt = DateTime.UtcNow;

            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        return MapToResponse(session);
    }

    public async Task<ChallengeAnswerResponse?> SaveAnswerAsync(string userId,Guid sessionId,Guid challengeId,SaveChallengeAnswerRequest request,CancellationToken cancellationToken = default)
    {
        var challenge = await _dbContext.Challenges
            .Include(challenge => challenge.LearningSession)
            .Include(challenge => challenge.Answer)
            .SingleOrDefaultAsync(
                challenge =>
                    challenge.Id == challengeId &&
                    challenge.LearningSessionId == sessionId &&
                    challenge.LearningSession.UserId == userId,
                cancellationToken);

        if (challenge is null)
        {
            return null;
        }

        if (challenge.LearningSession.Status != "InProgress")
        {
            throw new InvalidOperationException(
                "Answers can only be saved while the session is in progress.");
        }

        var answerText = request.Answer.Trim();

        if (string.IsNullOrWhiteSpace(answerText))
        {
            throw new ArgumentException(
                "Answer cannot be empty.");
        }

        var now = DateTime.UtcNow;

        if (challenge.Answer is null)
        {
            var newAnswer = new ChallengeAnswer
            {
                Id = Guid.NewGuid(),
                ChallengeId = challenge.Id,
                AnswerText = answerText,
                CreatedAt = now,
                UpdatedAt = now
            };

            // Explicitly tell EF Core this is a NEW database row.
            _dbContext.ChallengeAnswers.Add(newAnswer);

            challenge.Answer = newAnswer;
        }
        else
        {
            challenge.Answer.AnswerText = answerText;
            challenge.Answer.UpdatedAt = now;
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
        return new ChallengeAnswerResponse
        {
            ChallengeId = challenge.Id,
            Answer = challenge.Answer.AnswerText,
            UpdatedAt = challenge.Answer.UpdatedAt
        };
    }

    public async Task<LearningSessionResponse?> SubmitSessionAsync(string userId,Guid sessionId,CancellationToken cancellationToken = default)
    {
        var session = await _dbContext.LearningSessions
            .Include(session => session.Challenges)
                .ThenInclude(challenge => challenge.Answer)
            .SingleOrDefaultAsync(
                session =>
                    session.Id == sessionId &&
                    session.UserId == userId,
                cancellationToken);

        if (session is null)
        {
            return null;
        }

        if (session.Status != "InProgress")
        {
            throw new InvalidOperationException(
                "Only an in-progress session can be submitted.");
        }

        var hasUnansweredChallenges = session.Challenges.Any(
            challenge =>
                challenge.Answer is null ||
                string.IsNullOrWhiteSpace(
                    challenge.Answer.AnswerText));

        if (hasUnansweredChallenges)
        {
            throw new InvalidOperationException(
                "All challenges must have a saved answer before the session can be submitted.");
        }

        session.Status = "Submitted";

        await _dbContext.SaveChangesAsync(cancellationToken);

        return MapToResponse(session);
    }
}