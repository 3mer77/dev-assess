namespace DevAssess.Api.Dtos.Evaluation;

public class ChallengeReview
{
    public Guid ChallengeId { get; set; }

    public string Summary { get; set; } = string.Empty;

    public List<string> Strengths { get; set; } = [];

    public List<string> Gaps { get; set; } = [];

    public List<SkillObservation> Observations { get; set; } = [];
}