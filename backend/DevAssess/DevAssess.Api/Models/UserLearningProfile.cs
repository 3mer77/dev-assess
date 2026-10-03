namespace DevAssess.Api.Models;

public class UserLearningProfile
{
    public int Id { get; set; }

    public string UserId { get; set; } = string.Empty;

    public string TargetRole { get; set; } = string.Empty;

    public string Background { get; set; } = string.Empty;

    public string Goal { get; set; } = string.Empty;

    public int PreferredSessionMinutes { get; set; } = 20;

    public bool OnboardingCompleted { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ApplicationUser User { get; set; } = null!;
}