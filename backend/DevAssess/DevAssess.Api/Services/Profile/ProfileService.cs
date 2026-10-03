using DevAssess.Api.Data;
using DevAssess.Api.Dtos.Profile;
using DevAssess.Api.Interfaces.Profile;
using DevAssess.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace DevAssess.Api.Services.Profile;

public class ProfileService : IProfileService
{
    private readonly AppDbContext _dbContext;

    public ProfileService(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<LearningProfileResponse?> GetProfileAsync(
        string userId)
    {
        var profile = await _dbContext.UserLearningProfiles
            .AsNoTracking()
            .SingleOrDefaultAsync(
                profile => profile.UserId == userId);

        if (profile is null)
        {
            return null;
        }

        return MapToResponse(profile);
    }

    public async Task<LearningProfileResponse> CompleteOnboardingAsync(
        string userId,
        OnboardingRequest request)
    {
        var allowedSessionLengths = new[] { 10, 20, 40 };

        if (!allowedSessionLengths.Contains(
                request.PreferredSessionMinutes))
        {
            throw new ArgumentException(
                "Preferred session length must be 10, 20, or 40 minutes.");
        }

        var profile = await _dbContext.UserLearningProfiles
            .SingleOrDefaultAsync(
                profile => profile.UserId == userId);

        if (profile is null)
        {
            profile = new UserLearningProfile
            {
                UserId = userId,
                CreatedAt = DateTime.UtcNow
            };

            _dbContext.UserLearningProfiles.Add(profile);
        }

        profile.TargetRole = request.TargetRole.Trim();
        profile.Background = request.Background.Trim();
        profile.Goal = request.Goal.Trim();
        profile.PreferredSessionMinutes =
            request.PreferredSessionMinutes;

        profile.OnboardingCompleted = true;
        profile.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync();

        return MapToResponse(profile);
    }

    private static LearningProfileResponse MapToResponse(
        UserLearningProfile profile)
    {
        return new LearningProfileResponse
        {
            TargetRole = profile.TargetRole,
            Background = profile.Background,
            Goal = profile.Goal,
            PreferredSessionMinutes =
                profile.PreferredSessionMinutes,
            OnboardingCompleted =
                profile.OnboardingCompleted,
            CreatedAt = profile.CreatedAt,
            UpdatedAt = profile.UpdatedAt
        };
    }
}