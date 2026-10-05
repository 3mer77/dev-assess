using DevAssess.Api.Models;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace DevAssess.Api.Data;

public class AppDbContext : IdentityDbContext<ApplicationUser>
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public DbSet<UserLearningProfile> UserLearningProfiles { get; set; }

    public DbSet<RefreshToken> RefreshTokens { get; set; }

    public DbSet<LearningSession> LearningSessions { get; set; }

    public DbSet<Challenge> Challenges { get; set; }

    public DbSet<ChallengeAnswer> ChallengeAnswers { get; set; }

    public DbSet<Evaluation> Evaluations { get; set; }

    public DbSet<UserSkillEvidence> UserSkillEvidence { get; set; }


    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // -------------------------
        // Refresh Tokens
        // -------------------------

        builder.Entity<RefreshToken>()
            .HasOne(token => token.User)
            .WithMany(user => user.RefreshTokens)
            .HasForeignKey(token => token.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<RefreshToken>()
            .HasOne(token => token.ReplacedByToken)
            .WithMany()
            .HasForeignKey(token => token.ReplacedByTokenId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<RefreshToken>()
            .HasIndex(token => token.TokenHash)
            .IsUnique();


        // -------------------------
        // Learning Profile
        // -------------------------

        builder.Entity<UserLearningProfile>()
            .HasOne(profile => profile.User)
            .WithOne(user => user.LearningProfile)
            .HasForeignKey<UserLearningProfile>(
                profile => profile.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<UserLearningProfile>()
            .HasIndex(profile => profile.UserId)
            .IsUnique();


        // -------------------------
        // Learning Sessions
        // -------------------------

        builder.Entity<LearningSession>()
            .HasOne(session => session.User)
            .WithMany(user => user.LearningSessions)
            .HasForeignKey(session => session.UserId)
            .OnDelete(DeleteBehavior.Cascade);


        // -------------------------
        // Challenges
        // -------------------------

        builder.Entity<Challenge>()
            .HasOne(challenge => challenge.LearningSession)
            .WithMany(session => session.Challenges)
            .HasForeignKey(challenge => challenge.LearningSessionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<Challenge>()
            .HasIndex(challenge => new
            {
                challenge.LearningSessionId,
                challenge.Order
            })
            .IsUnique();


        // -------------------------
        // Challenge Answers
        // -------------------------

        builder.Entity<Challenge>()
            .HasOne(challenge => challenge.Answer)
            .WithOne(answer => answer.Challenge)
            .HasForeignKey<ChallengeAnswer>(
                answer => answer.ChallengeId)
            .OnDelete(DeleteBehavior.Cascade);

        // -------------------------
        // Session Evaluation
        // -------------------------

        builder.Entity<Evaluation>()
            .HasOne(evaluation => evaluation.LearningSession)
            .WithOne(session => session.Evaluation)
            .HasForeignKey<Evaluation>(
                evaluation => evaluation.LearningSessionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<Evaluation>()
            .HasIndex(evaluation => evaluation.LearningSessionId)
            .IsUnique();


        // -------------------------
        // Skill Evidence
        // -------------------------

        builder.Entity<UserSkillEvidence>()
            .HasOne(evidence => evidence.LearningSession)
            .WithMany(session => session.SkillEvidence)
            .HasForeignKey(evidence => evidence.LearningSessionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<UserSkillEvidence>()
            .HasIndex(evidence => new
            {
                evidence.UserId,
                evidence.SkillKey
            });
    }
}