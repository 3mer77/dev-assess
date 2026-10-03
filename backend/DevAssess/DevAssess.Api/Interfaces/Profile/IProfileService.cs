using DevAssess.Api.Dtos.Profile;

namespace DevAssess.Api.Interfaces.Profile;

public interface IProfileService
{
    Task<LearningProfileResponse?> GetProfileAsync(
        string userId);

    Task<LearningProfileResponse> CompleteOnboardingAsync(
        string userId,
        OnboardingRequest request);
}