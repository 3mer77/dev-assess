namespace DevAssess.Api.Dtos.Session;

public class LearningSessionResponse
{
    public Guid Id { get; set; }

    public string Title { get; set; } = string.Empty;

    public string Goal { get; set; } = string.Empty;

    public string Status { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }

    public DateTime? StartedAt { get; set; }

    public DateTime? CompletedAt { get; set; }

    public List<ChallengeResponse> Challenges { get; set; } = [];
}