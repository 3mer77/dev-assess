namespace DevAssess.Api.Interfaces.Assessment;

public interface ITranscriptionService
{
    Task<string> TranscribeAsync(
        byte[] audioBytes,
        string mimeType,
        CancellationToken cancellationToken = default);
}