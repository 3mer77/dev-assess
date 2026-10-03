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

    public DbSet<RefreshToken> RefreshTokens { get; set; }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

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

        // one-one relationship between the user's table and learningProfile table

        builder.Entity<UserLearningProfile>()
        .HasOne(profile => profile.User)
        .WithOne(user => user.LearningProfile)
        .HasForeignKey<UserLearningProfile>(profile => profile.UserId)
        .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<UserLearningProfile>()
            .HasIndex(profile => profile.UserId)
            .IsUnique();
    }

    public DbSet<UserLearningProfile> UserLearningProfiles { get; set; }
}