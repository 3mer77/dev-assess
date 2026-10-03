using System.Security.Claims;
using DevAssess.Api.Dtos.Profile;
using DevAssess.Api.Interfaces.Profile;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DevAssess.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ProfileController : ControllerBase
{
    private readonly IProfileService _profileService;

    public ProfileController(
        IProfileService profileService)
    {
        _profileService = profileService;
    }

    [HttpGet("GetProfile")]
    public async Task<IActionResult> GetProfile()
    {
        var userId =
            User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub");

        if (string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized();
        }

        var profile =
            await _profileService.GetProfileAsync(userId);

        if (profile is null)
        {
            return NotFound(new
            {
                message = "Learning profile not found."
            });
        }

        return Ok(profile);
    }

    [HttpPost("onboarding")]
    public async Task<IActionResult> CompleteOnboarding(OnboardingRequest request)
    {
        var userId =
            User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub");

        if (string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized();
        }

        try
        {
            var profile =
                await _profileService.CompleteOnboardingAsync(
                    userId,
                    request);

            return Ok(profile);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new
            {
                message = ex.Message
            });
        }
    }
}