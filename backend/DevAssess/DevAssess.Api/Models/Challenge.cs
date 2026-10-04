namespace DevAssess.Api.Models;

public class Challenge
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid LearningSessionId { get; set; }

    public string Type { get; set; } = string.Empty;

    public string Title { get; set; } = string.Empty;

    public string Prompt { get; set; } = string.Empty;

    public string Difficulty { get; set; } = string.Empty;

    public int Order { get; set; }

    public string ExpectedEvidenceJson { get; set; } = "[]";

    public LearningSession LearningSession { get; set; } = null!;

    public ChallengeAnswer? Answer { get; set; }
}