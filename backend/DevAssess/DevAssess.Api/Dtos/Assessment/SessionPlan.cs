namespace DevAssess.Api.Dtos.Assessment;

public class SessionPlan
{
    public string Title { get; set; } = string.Empty;

    public string Goal { get; set; } = string.Empty;

    public string Reason { get; set; } = string.Empty;

    public List<PlannedChallenge> Challenges { get; set; } = [];
}