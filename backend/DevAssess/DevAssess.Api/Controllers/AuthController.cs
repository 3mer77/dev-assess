using DevAssess.Api.Dtos.Auth;
using DevAssess.Api.Interfaces.Auth;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace DevAssess.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;

        public AuthController ( IAuthService authService )
        {
            _authService = authService;

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

            return Ok(result.User);
        }

    }
}
