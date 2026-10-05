namespace DevAssess.Api.Dtos.Evaluation;

public class SkillObservation
{
    public string Skill { get; set; } = string.Empty;

    public string Signal { get; set; } = string.Empty;

    public double Confidence { get; set; }

    public string Evidence { get; set; } = string.Empty;
}