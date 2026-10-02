using System.Net.Http.Json;
using DevAssess.Api.Interfaces.Email;

namespace DevAssess.Api.Services.Email;

public class BrevoEmailService : IEmailService
{
    private readonly HttpClient _http;
    private readonly IConfiguration _config;

    public BrevoEmailService(
        HttpClient http,
        IConfiguration config)
    {
        _http = http;
        _config = config;
    }

    public async Task SendVerificationCodeAsync(
        string email,
        string code)
    {
        using var request = new HttpRequestMessage(
            HttpMethod.Post,
            "https://api.brevo.com/v3/smtp/email");

        request.Headers.Add(
            "api-key",
            _config["Brevo:ApiKey"]);

        request.Content = JsonContent.Create(new
        {
            sender = new
            {
                name = _config["Brevo:SenderName"],
                email = _config["Brevo:SenderEmail"]
            },
            to = new[]
            {
                new { email }
            },
            subject = "Your DevAssess verification code",
            textContent =
                $"Your DevAssess verification code is: {code}"
        });

        using var response =
            await _http.SendAsync(request);

        //response.EnsureSuccessStatusCode();

        if (!response.IsSuccessStatusCode)
        {
            var errorBody =
                await response.Content.ReadAsStringAsync();

            throw new Exception(
                $"Brevo error: {response.StatusCode}. {errorBody}");
        }


    }
}