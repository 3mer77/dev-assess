using DevAssess.Api.Data;
using DevAssess.Api.Interfaces.Assessment;
using DevAssess.Api.Interfaces.Auth;
using DevAssess.Api.Interfaces.Email;
using DevAssess.Api.Interfaces.Profile;
using DevAssess.Api.Models;
using DevAssess.Api.Services.Assessment;
using DevAssess.Api.Services.auth;
using DevAssess.Api.Services.Auth;
using DevAssess.Api.Services.Email;
using DevAssess.Api.Services.Profile;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Scalar.AspNetCore;
using System.Text;
using System.Threading.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers();
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddDataProtection();

builder.Services
    .AddIdentityCore<ApplicationUser>(options =>
    {
        options.User.RequireUniqueEmail = true;

        // Lock account after 5 failed attempts
        options.Lockout.DefaultLockoutTimeSpan =
            TimeSpan.FromMinutes(5);

        options.Lockout.MaxFailedAccessAttempts = 5;

        options.Lockout.AllowedForNewUsers = true;

        options.Password.RequiredLength = 8;
        options.Password.RequireDigit = true;
        options.Password.RequireUppercase = true;
        options.Password.RequireLowercase = true;
        options.Password.RequireNonAlphanumeric = true;

        options.SignIn.RequireConfirmedEmail = true;
    })
    .AddEntityFrameworkStores<AppDbContext>()
    .AddDefaultTokenProviders()
    .AddTokenProvider<EmailOtpTokenProvider>("EmailOtp");
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters =
            new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,

                ValidIssuer =
                    builder.Configuration["Jwt:Issuer"],

                ValidAudience =
                    builder.Configuration["Jwt:Audience"],

                IssuerSigningKey =
                    new SymmetricSecurityKey(
                        Encoding.UTF8.GetBytes(
                            builder.Configuration["Jwt:Key"]!)),

                ClockSkew = TimeSpan.Zero
            };
    });

builder.Services.AddOpenApi();
    builder.Services.AddScoped<IAuthService, AuthService>();
    builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<IProfileService, ProfileService>();
builder.Services.AddScoped<ISessionService, SessionService>();
builder.Services.AddScoped<
    IAssessmentPlanner,
    GeminiAssessmentPlanner>();

builder.Services.AddSingleton<
    ISessionPlanValidator,
    SessionPlanValidator>();

builder.Services.AddScoped<
    ISessionService,
    SessionService>();
builder.Services.AddScoped<
    IAnswerReviewer,
    GeminiAnswerReviewer>();
builder.Services.AddScoped<
    IEvaluationService,
    EvaluationService>();
builder.Services.AddScoped<
    ITranscriptionService,
    GeminiTranscriptionService>();

builder.Services.AddScoped<
    ISkillEvidenceSummaryService,
    SkillEvidenceSummaryService>();
builder.Services.AddScoped<
    IAssessmentBudgetService,
    AssessmentBudgetService>();
builder.Services.AddSingleton<
    IAnswerEvaluationValidator,
    AnswerEvaluationValidator>();

builder.Services.AddHttpClient<
    IEmailService,
    BrevoEmailService>();

    // Ratelimiting configration

    builder.Services.AddRateLimiter(options =>
    {
        options.RejectionStatusCode =
            StatusCodes.Status429TooManyRequests;

        options.AddPolicy("auth", context =>
            RateLimitPartition.GetFixedWindowLimiter(
                partitionKey:
                    context.Connection.RemoteIpAddress?.ToString()
                    ?? "unknown",

                factory: _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = 10,
                    Window = TimeSpan.FromMinutes(1),
                    QueueLimit = 0,
                    AutoReplenishment = true
                }));
});

var app = builder.Build();

// Configure the HTTP request pipeline.
app.Environment.IsDevelopment();
    
        app.MapOpenApi();
        app.MapScalarApiReference();
    

    app.UseHttpsRedirection();

    app.UseRateLimiter();

    app.UseAuthentication();

    app.UseAuthorization();

    app.MapControllers();

    app.Run();
