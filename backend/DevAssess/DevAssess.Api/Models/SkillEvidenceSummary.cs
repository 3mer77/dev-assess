namespace DevAssess.Api.Models;

public sealed record SkillEvidenceSummary(
    string SkillKey,
    string State,
    string Priority,
    string Reason,
    int EvidenceCount
);