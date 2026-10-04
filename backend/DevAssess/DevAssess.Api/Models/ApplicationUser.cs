using Microsoft.AspNetCore.Identity;

namespace DevAssess.Api.Models
{
    public class ApplicationUser : IdentityUser


    {

        // Authentication
        public string DisplayName { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? LastVerificationEmailSentAt { get; set; }

        public DateTime? VerificationCodeExpiresAt { get; set; }

        public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();


        // User's Learning Profile
        public UserLearningProfile? LearningProfile { get; set; }

        public ICollection<LearningSession> LearningSessions { get; set; }
    = new List<LearningSession>();


    }
}
