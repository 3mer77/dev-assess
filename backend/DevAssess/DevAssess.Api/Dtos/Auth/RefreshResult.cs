namespace DevAssess.Api.Dtos.Auth;

public class RefreshResult
{
    public bool Succeeded { get; set; }

    public string? Error { get; set; }

    public string? AccessToken { get; set; }

    public string? RefreshToken { get; set; }

    public DateTime? RefreshTokenExpiresAt { get; set; }
}