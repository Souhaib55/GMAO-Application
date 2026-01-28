namespace API.Services
{
    public interface IEmailService
    {
        Task SendPasswordResetEmailAsync(string email, string resetToken, string resetUrl);
    }
}
