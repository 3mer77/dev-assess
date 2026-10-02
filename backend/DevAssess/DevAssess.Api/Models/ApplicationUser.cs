using Microsoft.AspNetCore.Identity;

namespace DevAssess.Api.Models
{
    public class ApplicationUser : IdentityUser
    {
        public string DisplayName { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? LastVerificationEmailSentAt { get; set; }

        public DateTime? VerificationCodeExpiresAt { get; set; }
    }
}
