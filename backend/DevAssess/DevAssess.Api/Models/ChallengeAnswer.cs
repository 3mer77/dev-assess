namespace DevAssess.Api.Models;

public class ChallengeAnswer
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid ChallengeId { get; set; }

    public string AnswerText { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Challenge Challenge { get; set; } = null!;
}