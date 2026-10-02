using System.ComponentModel.DataAnnotations;

namespace DevAssess.Api.Dtos.Auth;

public class ResendVerificationRequest
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;
}