using DevAssess.Api.Interfaces.Assessment;
using Google.GenAI;
using Google.GenAI.Types;

namespace DevAssess.Api.Services.Assessment;

public sealed class GeminiTranscriptionService : ITranscriptionService
{
    private readonly Client _client;
    private readonly string _model;

    public GeminiTranscriptionService(IConfiguration configuration)
    {
        var apiKey = configuration["Gemini:ApiKey"];

        if (string.IsNullOrWhiteSpace(apiKey))
        {
            throw new InvalidOperationException(
                "Gemini API key is not configured.");
        }

        _model =
            configuration["Gemini:TranscriptionModel"]
            ?? configuration["Gemini:Model"]
            ?? throw new InvalidOperationException(
                "Gemini model is not configured.");

        _client = new Client(apiKey: apiKey);
    }

    public async Task<string> TranscribeAsync(
        byte[] audioBytes,
        string mimeType,
        CancellationToken cancellationToken = default)
    {
        if (audioBytes.Length == 0)
        {
            throw new ArgumentException(
                "Audio cannot be empty.",
                nameof(audioBytes));
        }

        var instruction = """
        Transcribe the spoken answer faithfully.

        Important rules:

        - Return only the transcript.
        - Do not answer the technical question.
        - Do not improve the user's technical reasoning.
        - Do not correct technical mistakes.
        - Do not add missing information.
        - Do not summarize or paraphrase.
        - Preserve Arabic and English code-switching.
        - Preserve technical terminology as accurately as possible,
          including terms such as ASP.NET Core, C#, async/await,
          Entity Framework Core, SQL Server, PostgreSQL, Redis,
          Node.js, TypeScript, APIs, idempotency, Docker,
          Kubernetes, and similar engineering terminology.
        - You may add normal punctuation and capitalization for readability.
        - Do not include markdown, headings, explanations, or commentary.

        The transcript will be evaluated as the user's own answer,
        so preserving what the user actually said is critical.
        """;

        var content = new Content
        {
            Role = "user",
            Parts =
            [
                Part.FromText(instruction),
                Part.FromBytes(
                    audioBytes,
                    mimeType)
            ]
        };

        var response =
            await _client.Models.GenerateContentAsync(
                model: _model,
                contents: content,
                config: new GenerateContentConfig
                {
                    Temperature = 0
                },
                cancellationToken: cancellationToken);

        var text = response.Candidates?
            .FirstOrDefault()?
            .Content?
            .Parts?
            .FirstOrDefault(part =>
                !string.IsNullOrWhiteSpace(part.Text))?
            .Text;

        if (string.IsNullOrWhiteSpace(text))
        {
            throw new InvalidOperationException(
                "Gemini returned an empty transcription.");
        }

        return text.Trim();
    }
}