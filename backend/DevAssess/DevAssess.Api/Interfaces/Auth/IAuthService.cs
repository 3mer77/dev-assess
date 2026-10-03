using DevAssess.Api.Dtos.Auth;

namespace DevAssess.Api.Interfaces.Auth
{
    public interface IAuthService
    {
        Task<RefreshResult> RefreshAsync(string rawRefreshToken);
        Task<RegisterResult> RegisterAsync(RegisterRequest request);
        Task<bool> VerifyEmailAsync(VerifyEmailRequest request);
        Task<bool> ResendVerificationAsync(ResendVerificationRequest request);

        Task<LoginResult> LoginAsync(LoginRequest request);
        Task<bool> LogoutAsync(string rawRefreshToken);
    }
}
