namespace DevAssess.Api.Dtos.Session;

public class ChallengeAnswerResponse
{
    public Guid ChallengeId { get; set; }

    public string Answer { get; set; } = string.Empty;

    public DateTime UpdatedAt { get; set; }
}