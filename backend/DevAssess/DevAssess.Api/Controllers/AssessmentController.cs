using DevAssess.Api.Data;
using DevAssess.Api.Interfaces.Assessment;
using DevAssess.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace DevAssess.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AssessmentController : ControllerBase
{
    private readonly AppDbContext _dbContext;
    private readonly IAssessmentPlanner _assessmentPlanner;
    private readonly IAssessmentBudgetService _assessmentBudgetService;
    private readonly ISessionPlanValidator _sessionPlanValidator;

    private readonly IAnswerReviewer _answerReviewer;

    


    public AssessmentController(
        AppDbContext dbContext,
        IAssessmentPlanner assessmentPlanner,
        ISessionPlanValidator sessionPlanValidator,
         IAssessmentBudgetService assessmentBudgetService,
        IAnswerReviewer answerReviewer)
    {
        _dbContext = dbContext;
        _assessmentPlanner = assessmentPlanner;
        _sessionPlanValidator = sessionPlanValidator;
        _answerReviewer = answerReviewer;
        _assessmentBudgetService = assessmentBudgetService;
    }

    [HttpPost("test-plan")]
    public async Task<IActionResult> TestPlan(CancellationToken cancellationToken)
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

        var budget =
    _assessmentBudgetService.Calculate(
        profile.PreferredSessionMinutes);

        var plan = await _assessmentPlanner.CreatePlanAsync(
            profile,
            budget,
            Array.Empty<SkillEvidenceSummary>(),
            cancellationToken);

        var validationErrors =
      _sessionPlanValidator.Validate(
          plan,
          budget);

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

    [HttpPost("test-review/{sessionId:guid}")]
    public async Task<IActionResult> TestReview(
    Guid sessionId,
    CancellationToken cancellationToken)
    {
        var userId =
            User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub");

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
                message = "Learning profile not found."
            });
        }

        var session = await _dbContext.LearningSessions
            .AsNoTracking()
            .Include(session => session.Challenges)
                .ThenInclude(challenge => challenge.Answer)
            .SingleOrDefaultAsync(
                session =>
                    session.Id == sessionId &&
                    session.UserId == userId,
                cancellationToken);

        if (session is null)
        {
            return NotFound(new
            {
                message = "Session not found."
            });
        }

        if (session.Status != "Submitted")
        {
            return BadRequest(new
            {
                message = "Only submitted sessions can be reviewed."
            });
        }

        var hasMissingAnswers = session.Challenges.Any(
            challenge =>
                challenge.Answer is null ||
                string.IsNullOrWhiteSpace(
                    challenge.Answer.AnswerText));

        if (hasMissingAnswers)
        {
            return BadRequest(new
            {
                message = "The session contains unanswered challenges."
            });
        }

        var evaluation = await _answerReviewer.ReviewSessionAsync(
            profile,
            session,
            cancellationToken);

        return Ok(evaluation);
    }


}