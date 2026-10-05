using System.Text.Json;
using DevAssess.Api.Data;
using DevAssess.Api.Dtos.Evaluation;
using DevAssess.Api.Interfaces.Assessment;
using DevAssess.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace DevAssess.Api.Services.Assessment;

public class EvaluationService : IEvaluationService
{
    private readonly AppDbContext _dbContext;
    private readonly IAnswerReviewer _answerReviewer;
    private readonly IAnswerEvaluationValidator _evaluationValidator;
    private readonly IConfiguration _configuration;

    public EvaluationService(
        AppDbContext dbContext,
        IAnswerReviewer answerReviewer,
        IAnswerEvaluationValidator evaluationValidator,
        IConfiguration configuration)
    {
        _dbContext = dbContext;
        _answerReviewer = answerReviewer;
        _evaluationValidator = evaluationValidator;
        _configuration = configuration;
    }

    public async Task<AnswerEvaluation?> EvaluateSessionAsync(string userId,Guid sessionId,CancellationToken cancellationToken = default)
    {
        var session = await _dbContext.LearningSessions
            .Include(session => session.Challenges)
                .ThenInclude(challenge => challenge.Answer)
            .Include(session => session.Evaluation)
            .SingleOrDefaultAsync(
                session =>
                    session.Id == sessionId &&
                    session.UserId == userId,
                cancellationToken);

        if (session is null)
        {
            return null;
        }

        // If this session was already evaluated,
        // simply return the persisted result.
        if (session.Status == "Completed" &&
            session.Evaluation is not null)
        {
            return MapPersistedEvaluation(session.Evaluation);
        }

        if (session.Status != "Submitted")
        {
            throw new InvalidOperationException(
                "Only submitted sessions can be evaluated.");
        }

        if (session.Challenges.Count == 0)
        {
            throw new InvalidOperationException(
                "The session does not contain any challenges.");
        }

        var hasMissingAnswers = session.Challenges.Any(
            challenge =>
                challenge.Answer is null ||
                string.IsNullOrWhiteSpace(
                    challenge.Answer.AnswerText));

        if (hasMissingAnswers)
        {
            throw new InvalidOperationException(
                "All challenges must have a saved answer before evaluation.");
        }

        var profile = await _dbContext.UserLearningProfiles
            .AsNoTracking()
            .SingleOrDefaultAsync(
                profile => profile.UserId == userId,
                cancellationToken);

        if (profile is null)
        {
            throw new InvalidOperationException(
                "Learning profile not found.");
        }

        // --------------------------------------------
        // Submitted -> Evaluating
        // --------------------------------------------

        session.Status = "Evaluating";

        await _dbContext.SaveChangesAsync(
            cancellationToken);

        AnswerEvaluation evaluation;

        try
        {
            // --------------------------------------------
            // Ask Gemini to review the complete session
            // --------------------------------------------

            evaluation =
                await _answerReviewer.ReviewSessionAsync(
                    profile,
                    session,
                    cancellationToken);

            // --------------------------------------------
            // Validate Gemini output before SQL
            // --------------------------------------------

            var validationErrors =
                _evaluationValidator.Validate(
                    evaluation,
                    session);

            if (validationErrors.Count > 0)
            {
                throw new InvalidOperationException(
                    "Evaluation validation failed: " +
                    string.Join(" | ", validationErrors));
            }
        }
        catch
        {
            // Gemini failed, timed out, returned bad JSON,
            // or produced an invalid evaluation.
            //
            // The user's answers are still safely submitted,
            // so allow evaluation to be retried later.

            session.Status = "Submitted";

            await _dbContext.SaveChangesAsync(
                CancellationToken.None);

            throw;
        }

        // --------------------------------------------
        // Persist the valid evaluation
        // --------------------------------------------

        var evaluationEntity = new Evaluation
        {
            Id = Guid.NewGuid(),

            LearningSessionId = session.Id,

            Summary = evaluation.Summary,

            NextFocus = evaluation.NextFocus,

            ChallengeFeedbackJson =
                JsonSerializer.Serialize(
                    evaluation.ChallengeReviews),

            ReviewerModel =
                _configuration["Gemini:Model"]
                ?? "Gemini",

            CreatedAt = DateTime.UtcNow
        };

        _dbContext.Evaluations.Add(
            evaluationEntity);

        // --------------------------------------------
        // Persist skill evidence
        // --------------------------------------------

        foreach (var challengeReview
                 in evaluation.ChallengeReviews)
        {
            foreach (var observation
                     in challengeReview.Observations)
            {
                var evidence = new UserSkillEvidence
                {
                    Id = Guid.NewGuid(),

                    UserId = userId,

                    LearningSessionId = session.Id,

                    SkillKey = observation.Skill,

                    Signal = observation.Signal,

                    Confidence = observation.Confidence,

                    Evidence = observation.Evidence,

                    CreatedAt = DateTime.UtcNow
                };

                _dbContext.UserSkillEvidence.Add(
                    evidence);
            }
        }

        // --------------------------------------------
        // Evaluating -> Completed
        // --------------------------------------------

        session.Status = "Completed";
        session.CompletedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(
            cancellationToken);

        return evaluation;
    }

    private static AnswerEvaluation MapPersistedEvaluation(Evaluation evaluation)
    {
        var challengeReviews =
            JsonSerializer.Deserialize<List<ChallengeReview>>(
                evaluation.ChallengeFeedbackJson,
                new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                })
            ?? [];

        return new AnswerEvaluation
        {
            Summary = evaluation.Summary,
            NextFocus = evaluation.NextFocus,
            ChallengeReviews = challengeReviews
        };
    }

    public async Task<AnswerEvaluation?> GetEvaluationAsync(
    string userId,
    Guid sessionId,
    CancellationToken cancellationToken = default)
    {
        var evaluation = await _dbContext.Evaluations
            .AsNoTracking()
            .Include(evaluation => evaluation.LearningSession)
            .SingleOrDefaultAsync(
                evaluation =>
                    evaluation.LearningSessionId == sessionId &&
                    evaluation.LearningSession.UserId == userId,
                cancellationToken);

        if (evaluation is null)
        {
            return null;
        }

        return MapPersistedEvaluation(evaluation);
    }
}