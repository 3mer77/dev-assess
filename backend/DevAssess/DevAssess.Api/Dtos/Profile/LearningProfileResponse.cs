namespace DevAssess.Api.Dtos.Profile;

public class LearningProfileResponse
{
    public string TargetRole { get; set; } = string.Empty;

    public string Background { get; set; } = string.Empty;

    public string Goal { get; set; } = string.Empty;

    public int PreferredSessionMinutes { get; set; }

    public bool OnboardingCompleted { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }
}