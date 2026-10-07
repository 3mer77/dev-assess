using DevAssess.Api.Models;

namespace DevAssess.Api.Interfaces.Assessment;

public interface ISkillEvidenceSummaryService
{
    Task<IReadOnlyList<SkillEvidenceSummary>> GetForUserAsync(
        string userId,
        CancellationToken cancellationToken = default);
}