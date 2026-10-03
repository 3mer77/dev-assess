using DevAssess.Api.Dtos.Auth;
using DevAssess.Api.Interfaces.Auth;
using DevAssess.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using System.Security.Claims;

namespace DevAssess.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;
        private readonly UserManager<ApplicationUser> _userManager;

        public AuthController ( IAuthService authService , UserManager<ApplicationUser> userManager )
        {
            _authService = authService;
            _userManager = userManager;

        }

        [EnableRateLimiting("auth")]
        [HttpPost("register")]
        public async Task<ActionResult<UserResponse>> Register(RegisterRequest request)
        {
            var result = await _authService.RegisterAsync(request);

            if (!result.Succeeded)
            {
                return BadRequest(new
                {
                    errors = result.Errors
                });
            }

            return StatusCode(
                StatusCodes.Status201Created,
                result.User);
        }

        [EnableRateLimiting("auth")]
        [HttpPost("verify-email")]
        public async Task<IActionResult> VerifyEmail(VerifyEmailRequest request)
        {
            var succeeded = await _authService.VerifyEmailAsync(request);

            if (!succeeded)
            {
                return BadRequest(new
                {
                    message = "Invalid or expired verification code."
                });
            }

            return Ok(new
            {
                message = "Email verified successfully."
            });
        }

        [EnableRateLimiting("auth")]
        [HttpPost("resend-verification")]
        public async Task<IActionResult> ResendVerification(ResendVerificationRequest request)  
        {
            var succeeded = await _authService.ResendVerificationAsync(request);
 
            if (!succeeded)
            {
                return BadRequest(new
                {
                    message = "Unable to resend verification code."
                });
            }

            return Ok(new
            {
                message = "Verification request accepted."
            });
        }

        [EnableRateLimiting("auth")]
        [HttpPost("login")]
        public async Task<IActionResult> Login(LoginRequest request)
        {
            var result = await _authService.LoginAsync(request);

            if (!result.Succeeded)
            {
                return Unauthorized(new
                {
                    message = result.Error
                });
            }

            Response.Cookies.Append("refreshToken",result.RefreshToken!,new CookieOptions
            {
                HttpOnly = true,
                Secure = true,
                SameSite = SameSiteMode.Strict,
                Expires = result.RefreshTokenExpiresAt
            });

            return Ok(new
            {
                succeeded = true,
                accessToken = result.AccessToken,
                user = result.User
            });
        }

        [Authorize]
        [HttpGet("me")]
        public async Task<IActionResult> Me()
        {
            var userId =
                User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? User.FindFirstValue("sub");

            if (userId is null)
            {
                return Unauthorized();
            }

            var user = await _userManager.FindByIdAsync(userId);

            if (user is null)
            {
                return Unauthorized();
            }



            return Ok(new UserResponse
            {
                Id = user.Id,
                DisplayName = user.DisplayName,
                Email = user.Email!,
                EmailConfirmed = user.EmailConfirmed,
                CreatedAt = user.CreatedAt
            });
        }

        [HttpPost("refresh")]
        public async Task<IActionResult> Refresh()
        {
            var rawRefreshToken =
                Request.Cookies["refreshToken"];

            if (string.IsNullOrWhiteSpace(rawRefreshToken))
            {
                return Unauthorized(new
                {
                    message = "Refresh token is missing."
                });
            }

            var result =
                await _authService.RefreshAsync(
                    rawRefreshToken);

            if (!result.Succeeded)
            {
                return Unauthorized(new
                {
                    message = result.Error
                });
            }

            Response.Cookies.Append(
                "refreshToken",
                result.RefreshToken!,
                new CookieOptions
                {
                    HttpOnly = true,
                    Secure = true,
                    SameSite = SameSiteMode.Strict,
                    Expires = result.RefreshTokenExpiresAt
                });

            return Ok(new
            {
                accessToken = result.AccessToken
            });
        }

        [HttpPost("logout")]
        public async Task<IActionResult> Logout()
        {
            var rawRefreshToken =
                Request.Cookies["refreshToken"];

            if (!string.IsNullOrWhiteSpace(rawRefreshToken))
            {
                await _authService.LogoutAsync(
                    rawRefreshToken);
            }

            Response.Cookies.Delete(
                "refreshToken",
                new CookieOptions
                {
                    HttpOnly = true,
                    Secure = true,
                    SameSite = SameSiteMode.Strict
                });

            return NoContent();
        }

    }
}
