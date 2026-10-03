using DevAssess.Api.Models;

namespace DevAssess.Api.Dtos.Auth
{
    public interface ITokenService
    {
        public string CreateAccessToken(ApplicationUser user);
    }
}
