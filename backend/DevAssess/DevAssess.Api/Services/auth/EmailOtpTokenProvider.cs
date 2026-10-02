using DevAssess.Api.Models;
using Microsoft.AspNetCore.Identity;

namespace DevAssess.Api.Services.auth;

public class EmailOtpTokenProvider
    : TotpSecurityStampBasedTokenProvider<ApplicationUser>
{
    public override async Task<bool> CanGenerateTwoFactorTokenAsync(
        UserManager<ApplicationUser> manager,
        ApplicationUser user)
    {
        var email = await manager.GetEmailAsync(user);

        return !string.IsNullOrWhiteSpace(email);
    }
}