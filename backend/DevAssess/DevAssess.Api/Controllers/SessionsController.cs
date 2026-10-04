using DevAssess.Api.Dtos.Session;
using DevAssess.Api.Interfaces.Assessment;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;   

namespace DevAssess.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SessionsController : ControllerBase
{
    private readonly ISessionService _sessionService;

    public SessionsController(
        ISessionService sessionService)
    {
        _sessionService = sessionService;
    }

    [HttpPost]
    public async Task<IActionResult> CreateSession(CancellationToken cancellationToken)
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
            var session =
                await _sessionService.CreateSessionAsync(
                    userId,
                    cancellationToken);

            return CreatedAtAction(
                nameof(GetSession),
                new { id = session.Id },
                session);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new
            {
                message = ex.Message
            });
        }
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetSession(Guid id,CancellationToken cancellationToken)
    {
        var userId =
            User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub");

        if (string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized();
        }

        var session =
            await _sessionService.GetSessionAsync(
                userId,
                id,
                cancellationToken);

        if (session is null)
        {
            return NotFound(new
            {
                message = "Session not found."
            });
        }

        return Ok(session);
    }

    [HttpPost("{id:guid}/start")]
    public async Task<IActionResult> StartSession(Guid id,CancellationToken cancellationToken)
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
            var session =
                await _sessionService.StartSessionAsync(
                    userId,
                    id,
                    cancellationToken);

            if (session is null)
            {
                return NotFound(new
                {
                    message = "Session not found."
                });
            }

            return Ok(session);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new
            {
                message = ex.Message
            });
        }
    }

    [HttpPut("{sessionId:guid}/challenges/{challengeId:guid}/answer")]
    public async Task<IActionResult> SaveAnswer(Guid sessionId,Guid challengeId,SaveChallengeAnswerRequest request,CancellationToken cancellationToken)
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
            var result = await _sessionService.SaveAnswerAsync(
                userId,
                sessionId,
                challengeId,
                request,
                cancellationToken);

            if (result is null)
            {
                return NotFound(new
                {
                    message = "Session or challenge not found."
                });
            }

            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new
            {
                message = ex.Message
            });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new
            {
                message = ex.Message
            });
        }
    }

    [HttpPost("{id:guid}/submit")]
    public async Task<IActionResult> SubmitSession(Guid id ,CancellationToken cancellationToken)
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
            var session = await _sessionService.SubmitSessionAsync(
                userId,
                id,
                cancellationToken);

            if (session is null)
            {
                return NotFound(new
                {
                    message = "Session not found."
                });
            }

            return Ok(session);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new
            {
                message = ex.Message
            });
        }
    }
}