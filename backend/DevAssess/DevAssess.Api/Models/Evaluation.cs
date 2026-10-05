namespace DevAssess.Api.Models;

public class Evaluation
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid LearningSessionId { get; set; }

    public string Summary { get; set; } = string.Empty;

    public string NextFocus { get; set; } = string.Empty;

    // Detailed per-challenge reviewer feedback will be stored here as JSON.
    public string ChallengeFeedbackJson { get; set; } = "[]";

    // Useful for knowing which model produced this evaluation.
    public string ReviewerModel { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public LearningSession LearningSession { get; set; } = null!;
}