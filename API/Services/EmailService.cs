using System.Net;
using System.Net.Mail;

namespace API.Services
{
    public class EmailService : IEmailService
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<EmailService> _logger;

        public EmailService(IConfiguration configuration, ILogger<EmailService> logger)
        {
            _configuration = configuration;
            _logger = logger;
        }

        public async Task SendPasswordResetEmailAsync(string email, string resetToken, string resetUrl)
        {
            var smtpSettings = _configuration.GetSection("EmailSettings");
            
            var smtpHost = smtpSettings["SmtpHost"] ?? "smtp.gmail.com";
            var smtpPort = int.Parse(smtpSettings["SmtpPort"] ?? "587");
            var smtpUser = smtpSettings["SmtpUser"] ?? "";
            var smtpPassword = smtpSettings["SmtpPassword"] ?? "";
            var fromEmail = smtpSettings["FromEmail"] ?? smtpUser;
            var fromName = smtpSettings["FromName"] ?? "GMAO System";

            // Build the complete reset URL with token
            var completeResetUrl = $"{resetUrl}?token={Uri.EscapeDataString(resetToken)}&email={Uri.EscapeDataString(email)}";

            var subject = "GMAO - Réinitialisation de votre mot de passe";
            var body = GenerateEmailBody(completeResetUrl);

            try
            {
                using var client = new SmtpClient(smtpHost, smtpPort)
                {
                    Credentials = new NetworkCredential(smtpUser, smtpPassword),
                    EnableSsl = true
                };

                var mailMessage = new MailMessage
                {
                    From = new MailAddress(fromEmail, fromName),
                    Subject = subject,
                    Body = body,
                    IsBodyHtml = true
                };
                mailMessage.To.Add(email);

                await client.SendMailAsync(mailMessage);
                _logger.LogInformation("Password reset email sent to {Email}", email);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send password reset email to {Email}", email);
                throw new InvalidOperationException("Failed to send password reset email. Please try again later.");
            }
        }

        private string GenerateEmailBody(string resetUrl)
        {
            return $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='UTF-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
</head>
<body style='margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;'>
    <table role='presentation' style='width: 100%; border-collapse: collapse;'>
        <tr>
            <td align='center' style='padding: 40px 0;'>
                <table role='presentation' style='width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);'>
                    <!-- Header -->
                    <tr>
                        <td style='padding: 40px 40px 20px; text-align: center; background-color: #1976d2; border-radius: 8px 8px 0 0;'>
                            <h1 style='margin: 0; color: #ffffff; font-size: 28px;'>GMAO</h1>
                            <p style='margin: 10px 0 0; color: #e3f2fd; font-size: 14px;'>Système de Gestion de Maintenance</p>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style='padding: 40px;'>
                            <h2 style='margin: 0 0 20px; color: #333333; font-size: 22px;'>Réinitialisation de mot de passe</h2>
                            <p style='margin: 0 0 20px; color: #666666; font-size: 16px; line-height: 1.5;'>
                                Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :
                            </p>
                            
                            <table role='presentation' style='width: 100%; border-collapse: collapse;'>
                                <tr>
                                    <td align='center' style='padding: 30px 0;'>
                                        <a href='{resetUrl}' style='display: inline-block; padding: 14px 40px; background-color: #1976d2; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;'>
                                            Réinitialiser mon mot de passe
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style='margin: 0 0 15px; color: #666666; font-size: 14px; line-height: 1.5;'>
                                Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet email en toute sécurité.
                            </p>
                            
                            <p style='margin: 0 0 15px; color: #999999; font-size: 13px;'>
                                Ce lien expirera dans <strong>1 heure</strong>.
                            </p>
                            
                            <hr style='border: none; border-top: 1px solid #eeeeee; margin: 30px 0;'>
                            
                            <p style='margin: 0; color: #999999; font-size: 12px;'>
                                Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :<br>
                                <a href='{resetUrl}' style='color: #1976d2; word-break: break-all;'>{resetUrl}</a>
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style='padding: 20px 40px; text-align: center; background-color: #f8f9fa; border-radius: 0 0 8px 8px;'>
                            <p style='margin: 0; color: #999999; font-size: 12px;'>
                                © 2026 GMAO - Solution de Gestion de Maintenance<br>
                                Powered by Alcodex
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>";
        }
    }
}
