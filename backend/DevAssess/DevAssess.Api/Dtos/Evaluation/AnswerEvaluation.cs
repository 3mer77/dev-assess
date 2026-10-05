namespace DevAssess.Api.Dtos.Evaluation;

public class AnswerEvaluation
{
    public string Summary { get; set; } = string.Empty;

    public string NextFocus { get; set; } = string.Empty;

    public List<ChallengeReview> ChallengeReviews { get; set; } = [];
}