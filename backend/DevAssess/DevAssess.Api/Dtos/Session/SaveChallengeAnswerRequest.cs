using System.ComponentModel.DataAnnotations;

namespace DevAssess.Api.Dtos.Session;

public class SaveChallengeAnswerRequest
{
    [Required]
    [MaxLength(10000)]
    public string Answer { get; set; } = string.Empty;
}