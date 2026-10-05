namespace DevAssess.Api.Models;

public class LearningSession
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public string UserId { get; set; } = string.Empty;

    public string Title { get; set; } = string.Empty;

    public string Goal { get; set; } = string.Empty;

    public string Status { get; set; } = "Generated";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? StartedAt { get; set; }

    public DateTime? CompletedAt { get; set; }

    public ApplicationUser User { get; set; } = null!;

    public ICollection<Challenge> Challenges { get; set; }
        = new List<Challenge>();

    public Evaluation? Evaluation { get; set; }

    public ICollection<UserSkillEvidence> SkillEvidence { get; set; }
        = new List<UserSkillEvidence>();
}