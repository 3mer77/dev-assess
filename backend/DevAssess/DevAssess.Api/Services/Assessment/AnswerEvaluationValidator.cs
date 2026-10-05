using DevAssess.Api.Dtos.Evaluation;
using DevAssess.Api.Interfaces.Assessment;
using DevAssess.Api.Models;

namespace DevAssess.Api.Services.Assessment;

public class AnswerEvaluationValidator
    : IAnswerEvaluationValidator
{
    private static readonly HashSet<string> AllowedSignals =
    [
        "positive",
        "negative",
        "mixed",
        "insufficient"
    ];

    public IReadOnlyList<string> Validate(
        AnswerEvaluation evaluation,
        LearningSession session)
    {
        var errors = new List<string>();

        if (string.IsNullOrWhiteSpace(evaluation.Summary))
        {
            errors.Add("Evaluation summary is required.");
        }

        if (string.IsNullOrWhiteSpace(evaluation.NextFocus))
        {
            errors.Add("Evaluation next focus is required.");
        }

        if (evaluation.ChallengeReviews is null)
        {
            errors.Add("Challenge reviews are required.");
            return errors;
        }

        if (evaluation.ChallengeReviews.Count != session.Challenges.Count)
        {
            errors.Add(
                "Evaluation must contain exactly one review for every challenge.");
        }

        var sessionChallengeIds = session.Challenges
            .Select(challenge => challenge.Id)
            .ToHashSet();

        var reviewIds = evaluation.ChallengeReviews
            .Select(review => review.ChallengeId)
            .ToList();

        if (reviewIds.Distinct().Count() != reviewIds.Count)
        {
            errors.Add(
                "Evaluation contains duplicate challenge reviews.");
        }

        foreach (var review in evaluation.ChallengeReviews)
        {
            if (!sessionChallengeIds.Contains(review.ChallengeId))
            {
                errors.Add(
                    $"Evaluation contains unknown challenge ID '{review.ChallengeId}'.");
            }

            if (string.IsNullOrWhiteSpace(review.Summary))
            {
                errors.Add(
                    $"Challenge '{review.ChallengeId}' requires a summary.");
            }

            if (review.Observations is null ||
                review.Observations.Count == 0)
            {
                errors.Add(
                    $"Challenge '{review.ChallengeId}' requires at least one skill observation.");

                continue;
            }

            var challenge = session.Challenges
                .SingleOrDefault(c => c.Id == review.ChallengeId);

            if (challenge is null)
            {
                continue;
            }

            var expectedSkills =
                ParseExpectedEvidence(challenge.ExpectedEvidenceJson);

            foreach (var observation in review.Observations)
            {
                if (string.IsNullOrWhiteSpace(observation.Skill))
                {
                    errors.Add(
                        $"Challenge '{review.ChallengeId}' contains an empty skill key.");
                }

                if (!AllowedSignals.Contains(observation.Signal))
                {
                    errors.Add(
                        $"Invalid signal '{observation.Signal}' for skill '{observation.Skill}'.");
                }

                if (observation.Confidence < 0 ||
                    observation.Confidence > 1)
                {
                    errors.Add(
                        $"Confidence for '{observation.Skill}' must be between 0 and 1.");
                }

                if (string.IsNullOrWhiteSpace(observation.Evidence))
                {
                    errors.Add(
                        $"Observation '{observation.Skill}' requires evidence.");
                }

                if (!expectedSkills.Contains(observation.Skill))
                {
                    errors.Add(
                        $"Skill '{observation.Skill}' was not expected for challenge '{review.ChallengeId}'.");
                }
            }
        }

        return errors;
    }

    private static HashSet<string> ParseExpectedEvidence(
        string expectedEvidenceJson)
    {
        try
        {
            var skills =
                System.Text.Json.JsonSerializer.Deserialize<List<string>>(
                    expectedEvidenceJson)
                ?? [];

            return skills.ToHashSet();
        }
        catch
        {
            return [];
        }
    }
}