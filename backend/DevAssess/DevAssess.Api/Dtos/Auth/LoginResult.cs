namespace DevAssess.Api.Dtos.Auth;

public class LoginResult
{
    public bool Succeeded { get; set; }

    public string? Error { get; set; }

    public string? AccessToken { get; set; }

    public UserResponse? User { get; set; }
}