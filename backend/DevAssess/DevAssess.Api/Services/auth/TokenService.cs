using DevAssess.Api.Data;
using DevAssess.Api.Dtos.Auth;
using DevAssess.Api.Interfaces.Auth;
using DevAssess.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace DevAssess.Api.Services.Auth;

public class TokenService : ITokenService
{
    private readonly IConfiguration _config;
    private readonly AppDbContext _dbContext;

    public TokenService(IConfiguration config , AppDbContext dbContext)
    {
        _config = config;
        _dbContext = dbContext;
    }

    public string CreateAccessToken(ApplicationUser user)
    {
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id),
            new(JwtRegisteredClaimNames.Email, user.Email!),
            new("displayName", user.DisplayName)
        };

        var key = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(
                _config["Jwt:Key"]!));

        var credentials = new SigningCredentials(
            key,
            SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(
                int.Parse(_config["Jwt:AccessTokenMinutes"]!)),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler()
            .WriteToken(token);
    }

    public async Task<RefreshTokenResult> CreateRefreshTokenAsync(ApplicationUser user)
    {
        var randomBytes = RandomNumberGenerator.GetBytes(64);

        var rawToken = Convert.ToBase64String(randomBytes);

        var tokenHash = HashRefreshToken(rawToken);



        var expiresAt = DateTime.UtcNow.AddDays(7);

        var refreshToken = new RefreshToken
        {
            UserId = user.Id,
            TokenHash = tokenHash,
            ExpiresAt = expiresAt
        };

        _dbContext.RefreshTokens.Add(refreshToken);

        await _dbContext.SaveChangesAsync();

        return new RefreshTokenResult
        {
            TokenId = refreshToken.Id,
            RawToken = rawToken,
            ExpiresAt = expiresAt
        };
    }

    public string HashRefreshToken(string rawToken)
    {
        return Convert.ToHexString(
            SHA256.HashData(
                Encoding.UTF8.GetBytes(rawToken)));
    }
}