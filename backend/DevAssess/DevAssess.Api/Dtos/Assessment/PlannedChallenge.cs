namespace DevAssess.Api.Dtos.Assessment;

public class PlannedChallenge
{
    public string Type { get; set; } = string.Empty;

    public string Title { get; set; } = string.Empty;

    public string Prompt { get; set; } = string.Empty;

    public string Difficulty { get; set; } = string.Empty;

    public int Order { get; set; }

    public List<string> ExpectedEvidence { get; set; } = [];
}