using DevAssess.Api.Data;
using DevAssess.Api.Interfaces.Assessment;
using DevAssess.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace DevAssess.Api.Services.Assessment;

public sealed class SkillEvidenceSummaryService
    : ISkillEvidenceSummaryService
{
    private readonly AppDbContext _dbContext;

    public SkillEvidenceSummaryService(
        AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<SkillEvidenceSummary>> GetForUserAsync(
        string userId,
        CancellationToken cancellationToken = default)
    {
        var evidenceRows = await _dbContext.UserSkillEvidence
            .AsNoTracking()
            .Where(evidence => evidence.UserId == userId)
            .OrderByDescending(evidence => evidence.CreatedAt)
            .ToListAsync(cancellationToken);

        if (evidenceRows.Count == 0)
        {
            return [];
        }

        var summaries = evidenceRows
            .GroupBy(evidence => evidence.SkillKey)
            .Select(group =>
            {
                var recentEvidence = group
                    .OrderByDescending(evidence => evidence.CreatedAt)
                    .Take(3)
                    .ToList();

                return BuildSummary(
                    group.Key,
                    recentEvidence);
            })
            .OrderBy(summary =>
                GetPriorityOrder(summary.Priority))
            .ThenBy(summary => summary.SkillKey)
            .ToList();

        return summaries;
    }

    private static SkillEvidenceSummary BuildSummary(
        string skillKey,
        IReadOnlyList<UserSkillEvidence> recentEvidence)
    {
        var positiveCount = recentEvidence.Count(
            evidence =>
                evidence.Signal.Equals(
                    "positive",
                    StringComparison.OrdinalIgnoreCase));

        var negativeCount = recentEvidence.Count(
            evidence =>
                evidence.Signal.Equals(
                    "negative",
                    StringComparison.OrdinalIgnoreCase));

        var mixedCount = recentEvidence.Count(
            evidence =>
                evidence.Signal.Equals(
                    "mixed",
                    StringComparison.OrdinalIgnoreCase));

        var insufficientCount = recentEvidence.Count(
            evidence =>
                evidence.Signal.Equals(
                    "insufficient",
                    StringComparison.OrdinalIgnoreCase));

        if (negativeCount > 0)
        {
            return new SkillEvidenceSummary(
                SkillKey: skillKey,
                State: "needs-review",
                Priority: "high",
                Reason: "Recent evidence contains a technical misconception.",
                EvidenceCount: recentEvidence.Count);
        }

        if (mixedCount > 0)
        {
            return new SkillEvidenceSummary(
                SkillKey: skillKey,
                State: "developing",
                Priority: "high",
                Reason: "Recent evidence is mixed and needs further validation.",
                EvidenceCount: recentEvidence.Count);
        }

        if (insufficientCount == recentEvidence.Count)
        {
            return new SkillEvidenceSummary(
                SkillKey: skillKey,
                State: "insufficient",
                Priority: "high",
                Reason: "There is not enough evidence to assess this skill.",
                EvidenceCount: recentEvidence.Count);
        }

        if (positiveCount >= 2 &&
            negativeCount == 0 &&
            mixedCount == 0)
        {
            return new SkillEvidenceSummary(
                SkillKey: skillKey,
                State: "strong",
                Priority: "low",
                Reason: "Repeated recent evidence is positive.",
                EvidenceCount: recentEvidence.Count);
        }

        if (positiveCount == 1 &&
            negativeCount == 0 &&
            mixedCount == 0)
        {
            return new SkillEvidenceSummary(
                SkillKey: skillKey,
                State: "promising",
                Priority: "medium",
                Reason: "Positive evidence exists but should be confirmed.",
                EvidenceCount: recentEvidence.Count);
        }

        return new SkillEvidenceSummary(
            SkillKey: skillKey,
            State: "insufficient",
            Priority: "high",
            Reason: "The available evidence is not strong enough to classify confidently.",
            EvidenceCount: recentEvidence.Count);
    }

    private static int GetPriorityOrder(
        string priority)
    {
        return priority switch
        {
            "high" => 1,
            "medium" => 2,
            "low" => 3,
            _ => 4
        };
    }
}