using System.ComponentModel.DataAnnotations;

namespace DevAssess.Api.Dtos.Profile;

public class OnboardingRequest
{
    [Required]
    [MaxLength(100)]
    public string TargetRole { get; set; } = string.Empty;

    [Required]
    [MaxLength(2000)]
    public string Background { get; set; } = string.Empty;

    [Required]
    [MaxLength(500)]
    public string Goal { get; set; } = string.Empty;

    [Required]
    public int PreferredSessionMinutes { get; set; } = 20;
}