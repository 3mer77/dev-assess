namespace DevAssess.Api.Dtos.Auth;

public class RegisterResult
{
    public bool Succeeded { get; set; }

    public UserResponse? User { get; set; }

    public List<string> Errors { get; set; } = [];
}