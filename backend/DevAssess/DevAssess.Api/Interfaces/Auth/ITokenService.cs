using DevAssess.Api.Dtos.Auth;
using DevAssess.Api.Models;

namespace DevAssess.Api.Interfaces.Auth
{
    public interface ITokenService
    {
        public string CreateAccessToken(ApplicationUser user);

        Task<RefreshTokenResult> CreateRefreshTokenAsync(ApplicationUser user);

        string HashRefreshToken(string rawToken);
    }
}
