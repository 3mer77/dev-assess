using System.Text.RegularExpressions;
using DevAssess.Api.Dtos.Assessment;
using DevAssess.Api.Interfaces.Assessment;

namespace DevAssess.Api.Services.Assessment;

    public class SessionPlanValidator : ISessionPlanValidator
    {
        private static readonly HashSet<string> AllowedTypes =
    [
        "Concept",
        "Debugging",
        "ApiDesign",
        "Architecture",
        "CodeExplanation"
    ];

    private static readonly HashSet<string> AllowedDifficulties =
    [
        "Easy",
        "Medium",
        "Hard"
    ];

    private static readonly Regex SkillKeyPattern =
        new(
            @"^[a-z0-9]+(?:-[a-z0-9]+)*(?:\.[a-z0-9]+(?:-[a-z0-9]+)*)+$",
            RegexOptions.Compiled);

    public IReadOnlyList<string> Validate(SessionPlan plan)
    {
        var errors = new List<string>();

        ValidateSession(plan, errors);
        ValidateChallenges(plan, errors);

        return errors;
    }

    private static void ValidateSession(
        SessionPlan plan,
        List<string> errors)
    {
        if (string.IsNullOrWhiteSpace(plan.Title))
        {
            errors.Add("Session title is required.");
        }

        if (string.IsNullOrWhiteSpace(plan.Goal))
        {
            errors.Add("Session goal is required.");
        }

        if (string.IsNullOrWhiteSpace(plan.Reason))
        {
            errors.Add("Session reason is required.");
        }

        if (plan.Challenges is null)
        {
            errors.Add("Challenges are required.");
            return;
        }

        if (plan.Challenges.Count != 5)
        {
            errors.Add(
                $"Session must contain exactly 5 challenges. Received {plan.Challenges.Count}.");
        }
    }

    private static void ValidateChallenges(
        SessionPlan plan,
        List<string> errors)
    {
        if (plan.Challenges is null || plan.Challenges.Count == 0)
        {
            return;
        }

        var orders = plan.Challenges
            .Select(challenge => challenge.Order)
            .OrderBy(order => order)
            .ToList();

        var expectedOrders = new[] { 1, 2, 3, 4, 5 };

        if (!orders.SequenceEqual(expectedOrders))
        {
            errors.Add(
                "Challenge orders must be exactly 1, 2, 3, 4, and 5.");
        }

        for (var i = 0; i < plan.Challenges.Count; i++)
        {
            var challenge = plan.Challenges[i];

            ValidateChallenge(challenge, i + 1, errors);
        }

        ValidateInitialDifficultyDistribution(plan, errors);
    }

    private static void ValidateChallenge(
        PlannedChallenge challenge,
        int position,
        List<string> errors)
    {
        if (!AllowedTypes.Contains(challenge.Type))
        {
            errors.Add(
                $"Challenge {position} has invalid type '{challenge.Type}'.");
        }

        if (!AllowedDifficulties.Contains(challenge.Difficulty))
        {
            errors.Add(
                $"Challenge {position} has invalid difficulty '{challenge.Difficulty}'.");
        }

        if (string.IsNullOrWhiteSpace(challenge.Title))
        {
            errors.Add(
                $"Challenge {position} must have a title.");
        }

        if (string.IsNullOrWhiteSpace(challenge.Prompt))
        {
            errors.Add(
                $"Challenge {position} must have a prompt.");
        }

        if (challenge.ExpectedEvidence is null ||
            challenge.ExpectedEvidence.Count == 0)
        {
            errors.Add(
                $"Challenge {position} must contain expected evidence.");

            return;
        }

        if (challenge.ExpectedEvidence.Count > 4)
        {
            errors.Add(
                $"Challenge {position} should contain no more than 4 expected evidence keys.");
        }

        var duplicateEvidence = challenge.ExpectedEvidence
            .Where(skill => !string.IsNullOrWhiteSpace(skill))
            .GroupBy(skill => skill)
            .Where(group => group.Count() > 1)
            .Select(group => group.Key)
            .ToList();

        if (duplicateEvidence.Count > 0)
        {
            errors.Add(
                $"Challenge {position} contains duplicate evidence keys.");
        }

        foreach (var skill in challenge.ExpectedEvidence)
        {
            if (string.IsNullOrWhiteSpace(skill))
            {
                errors.Add(
                    $"Challenge {position} contains an empty evidence key.");

                continue;
            }

            if (!SkillKeyPattern.IsMatch(skill))
            {
                errors.Add(
                    $"Challenge {position} contains invalid skill key '{skill}'.");
            }
        }
    }

    private static void ValidateInitialDifficultyDistribution(
        SessionPlan plan,
        List<string> errors)
    {
        var easyCount = plan.Challenges.Count(
            challenge => challenge.Difficulty == "Easy");

        var mediumCount = plan.Challenges.Count(
            challenge => challenge.Difficulty == "Medium");

        var hardCount = plan.Challenges.Count(
            challenge => challenge.Difficulty == "Hard");

        if (easyCount != 1 ||
            mediumCount != 3 ||
            hardCount != 1)
        {
            errors.Add(
                "Initial calibration must contain exactly 1 Easy, 3 Medium, and 1 Hard challenge.");
        }
    }
}