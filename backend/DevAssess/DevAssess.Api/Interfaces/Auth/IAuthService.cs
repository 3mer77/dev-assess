using DevAssess.Api.Dtos.Auth;

namespace DevAssess.Api.Interfaces.Auth
{
    public interface IAuthService
    {
        Task<RegisterResult> RegisterAsync(RegisterRequest request);
        Task<bool> VerifyEmailAsync(VerifyEmailRequest request);
        Task<bool> ResendVerificationAsync(ResendVerificationRequest request);
    }
}
