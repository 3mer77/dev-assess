using System.Security.Claims;
using DevAssess.Api.Data;
using DevAssess.Api.Interfaces.Assessment;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DevAssess.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AssessmentController : ControllerBase
{
    private readonly AppDbContext _dbContext;
    private readonly IAssessmentPlanner _assessmentPlanner;
    private readonly ISessionPlanValidator _sessionPlanValidator;

    public AssessmentController(
    AppDbContext dbContext,
    IAssessmentPlanner assessmentPlanner,
    ISessionPlanValidator sessionPlanValidator)
    {
        _dbContext = dbContext;
        _assessmentPlanner = assessmentPlanner;
        _sessionPlanValidator = sessionPlanValidator;
    }

    [HttpPost("test-plan")]
    public async Task<IActionResult> TestPlan(
        CancellationToken cancellationToken)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");

        if (string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized();
        }

        var profile = await _dbContext.UserLearningProfiles
            .AsNoTracking()
            .SingleOrDefaultAsync(
                profile => profile.UserId == userId,
                cancellationToken);

        if (profile is null)
        {
            return BadRequest(new
            {
                message = "Complete onboarding before generating an assessment."
            });
        }

        if (!profile.OnboardingCompleted)
        {
            return BadRequest(new
            {
                message = "Onboarding is not completed."
            });
        }

        var plan = await _assessmentPlanner.CreatePlanAsync(profile , cancellationToken);

        var validationErrors = _sessionPlanValidator.Validate(plan);

        if (validationErrors.Count > 0)
        {
            return UnprocessableEntity(new
            {
                message = "Gemini generated an invalid assessment plan.",
                errors = validationErrors,
                plan
            });
        }

        return Ok(plan);
    }
}