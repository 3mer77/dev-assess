using DevAssess.Api.Dtos.Transcription;
using DevAssess.Api.Interfaces.Assessment;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DevAssess.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class TranscriptionController : ControllerBase
{
    private const long MaxAudioSize =
        10 * 1024 * 1024;

    private static readonly HashSet<string>
        AllowedMimeTypes =
        new(StringComparer.OrdinalIgnoreCase)
        {
            "audio/webm",
            "audio/m4a",
            "audio/aac",
            "audio/ogg",
            "audio/wav",
            "audio/mpeg",
            "audio/mp3",
            "audio/flac",
            "audio/opus"
        };

    private readonly ITranscriptionService
        _transcriptionService;

    public TranscriptionController(
        ITranscriptionService transcriptionService)
    {
        _transcriptionService =
            transcriptionService;
    }

    [HttpPost]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(MaxAudioSize)]
    public async Task<ActionResult<TranscriptionResponse>>
        Transcribe(
            [FromForm] IFormFile audio,
            CancellationToken cancellationToken)
    {
        if (audio is null || audio.Length == 0)
        {
            return BadRequest(new
            {
                message = "An audio file is required."
            });
        }

        if (audio.Length > MaxAudioSize)
        {
            return StatusCode(
                StatusCodes.Status413PayloadTooLarge,
                new
                {
                    message =
                        "Audio file must be 10 MB or smaller."
                });
        }

        var mimeType =
            NormalizeMimeType(audio.ContentType);

        if (!AllowedMimeTypes.Contains(mimeType))
        {
            return BadRequest(new
            {
                message =
                    $"Unsupported audio format '{audio.ContentType}'."
            });
        }

        await using var memoryStream =
            new MemoryStream();

        await audio.CopyToAsync(
            memoryStream,
            cancellationToken);

        var transcript =
            await _transcriptionService.TranscribeAsync(
                memoryStream.ToArray(),
                mimeType,
                cancellationToken);

        return Ok(
            new TranscriptionResponse(
                transcript));
    }

    private static string NormalizeMimeType(
        string? contentType)
    {
        if (string.IsNullOrWhiteSpace(contentType))
        {
            return string.Empty;
        }

        return contentType
            .Split(';', 2)[0]
            .Trim()
            .ToLowerInvariant();
    }
}