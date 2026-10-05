namespace DevAssess.Api.Models;

public class UserSkillEvidence
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public string UserId { get; set; } = string.Empty;

    public Guid LearningSessionId { get; set; }

    public string SkillKey { get; set; } = string.Empty;

    public string Signal { get; set; } = string.Empty;

    public double Confidence { get; set; }

    public string Evidence { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public LearningSession LearningSession { get; set; } = null!;
}