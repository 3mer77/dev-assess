namespace DevAssess.Api.Models;

public class RefreshToken
{
    public int Id { get; set; }

    public string UserId { get; set; } = string.Empty;

    public string TokenHash { get; set; } = string.Empty;

    public DateTime ExpiresAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? RevokedAt { get; set; }

    public int? ReplacedByTokenId { get; set; }

    public ApplicationUser User { get; set; } = null!;

    public RefreshToken? ReplacedByToken { get; set; }
}