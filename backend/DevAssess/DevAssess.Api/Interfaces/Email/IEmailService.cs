namespace DevAssess.Api.Interfaces.Email;

public interface IEmailService
{
    Task SendVerificationCodeAsync(string email, string code);
}