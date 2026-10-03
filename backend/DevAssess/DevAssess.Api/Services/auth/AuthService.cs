using DevAssess.Api.Dtos.Auth;
using DevAssess.Api.Interfaces.Auth;
using DevAssess.Api.Interfaces.Email;
using DevAssess.Api.Models;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Identity;

namespace DevAssess.Api.Services.auth
{
    public class AuthService : IAuthService
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly IEmailService _emailService;
        private readonly ITokenService _tokenService;

        public AuthService (UserManager <ApplicationUser> userManager , IEmailService emailService, ITokenService tokenService)
        {
            _userManager = userManager;
            _emailService = emailService;
            _tokenService = tokenService;


        }

        public async Task<RegisterResult> RegisterAsync(RegisterRequest request)
        {
            var existingUser = await _userManager.FindByEmailAsync(request.Email);

            if (existingUser is not null)
            {
                return new RegisterResult
                {
                    Succeeded = false,
                    Errors = ["A user with this email already exists."]
                };
            }

            var user = new ApplicationUser
            {
                DisplayName = request.DisplayName,
                Email = request.Email,
                UserName = request.Email
            };

            var result = await _userManager.CreateAsync(user, request.Password);

            if (!result.Succeeded)
            {

                return new RegisterResult
                {
                    Succeeded = false,
                    Errors = result.Errors
                        .Select(error => error.Description)
                        .ToList()
                };
            }

            // send verification code to user email after we check that the user has been created successfully
            var verificationCode = await _userManager.GenerateUserTokenAsync(user,"EmailOtp" ,"EmailVerification");
            await _emailService.SendVerificationCodeAsync(user.Email!, verificationCode);


            var now = DateTime.UtcNow;

            user.LastVerificationEmailSentAt = now;
            user.VerificationCodeExpiresAt = now.AddMinutes(5);

            var updateResult = await _userManager.UpdateAsync(user);

            if (!updateResult.Succeeded)
            {
                throw new InvalidOperationException(
                    "Failed to update verification email timestamp.");
            }

            return new RegisterResult   
            {
                Succeeded = true,
               

                User = new UserResponse
                {
                    Id = user.Id,
                    DisplayName = user.DisplayName,
                    Email = user.Email!,
                    EmailConfirmed = user.EmailConfirmed,
                    CreatedAt = user.CreatedAt
                }
            };
        }

        public async Task<bool> VerifyEmailAsync(VerifyEmailRequest request)
        {
            var user = await _userManager.FindByEmailAsync(request.Email);

            if (user is null || user.EmailConfirmed)
            {
                return false;
            }

            // Reject verification attempts during lockout.
            if (await _userManager.IsLockedOutAsync(user))
            {
                return false;
            }

            if (user.VerificationCodeExpiresAt is null || DateTime.UtcNow > user.VerificationCodeExpiresAt.Value)
            {
                return false;
            }

            var isValid = await _userManager.VerifyUserTokenAsync(
                user,
                "EmailOtp",
                "EmailVerification",
                request.Code);

            if (!isValid)
            {
                // Record an unsuccessful attempt.
                await _userManager.AccessFailedAsync(user);
                return false;
            }


            // The correct code was provided.
            user.EmailConfirmed = true;

            var result = await _userManager.UpdateAsync(user);

            // Clear the unsuccessful-attempt counter.
            await _userManager.ResetAccessFailedCountAsync(user);

            return result.Succeeded;
        }

        public async Task<bool> ResendVerificationAsync(ResendVerificationRequest request)
        {
            var user = await _userManager.FindByEmailAsync(
                request.Email);

            if (user is null || user.EmailConfirmed)
            {
                return false;
            }

            var now = DateTime.UtcNow;

            if (user.LastVerificationEmailSentAt.HasValue)
            {
                var elapsed = now -
                    user.LastVerificationEmailSentAt.Value;

                if (elapsed < TimeSpan.FromSeconds(60))
                {
                    return false;
                }
            }

            var code = await _userManager.GenerateUserTokenAsync(
                user,
                "EmailOtp",
                "EmailVerification");

                await _emailService.SendVerificationCodeAsync(user.Email!, code);

            user.LastVerificationEmailSentAt = now;
            user.VerificationCodeExpiresAt = now.AddMinutes(5);

            var result = await _userManager.UpdateAsync(user);

            return result.Succeeded;
        }

        public async Task<LoginResult> LoginAsync(LoginRequest request)
        {
            var user = await _userManager.FindByEmailAsync(
                request.Email);

            if (user is null)
            {
                return new LoginResult
                {
                    Error = "Invalid email or password."
                };
            }

            // Respect Identity's existing account lockout.
            if (await _userManager.IsLockedOutAsync(user))
            {
                return new LoginResult
                {
                    Error = "Unable to sign in right now."
                };
            }

            var validPassword =
                await _userManager.CheckPasswordAsync(
                    user,
                    request.Password);

            if (!validPassword)
            {
                await _userManager.AccessFailedAsync(user);

                return new LoginResult
                {
                    Error = "Invalid email or password."
                };
            }

            if (!user.EmailConfirmed)
            {
                return new LoginResult
                {
                    Error = "Please verify your email before signing in."
                };
            }

            await _userManager.ResetAccessFailedCountAsync(user);

            var accessToken = _tokenService.CreateAccessToken(user);

            return new LoginResult
            {
                Succeeded = true,

                AccessToken = accessToken,

                User = new UserResponse
                {
                    Id = user.Id,
                    DisplayName = user.DisplayName,
                    Email = user.Email!,
                    EmailConfirmed = user.EmailConfirmed,
                    CreatedAt = user.CreatedAt
                }
            };
        }

    }
}
