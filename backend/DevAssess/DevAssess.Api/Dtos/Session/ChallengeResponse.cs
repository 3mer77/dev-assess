namespace DevAssess.Api.Dtos.Session;

public class ChallengeResponse
{
    public Guid Id { get; set; }

    public string Type { get; set; } = string.Empty;

    public string Title { get; set; } = string.Empty;

    public string Prompt { get; set; } = string.Empty;

    public string Difficulty { get; set; } = string.Empty;

    public int Order { get; set; }

    public string? Answer { get; set; }

    public DateTime? AnswerUpdatedAt { get; set; }
}