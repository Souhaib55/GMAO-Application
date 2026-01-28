# Forgot Password Feature - Implementation Guide

## Overview
A complete "Forgot Password" feature has been implemented for your GMAO application. This feature allows users (Superviseur, Demandeur, Utilisateur) to reset their password via email.

## How It Works

### User Flow:
1. User clicks "Mot de passe oublié?" on the login page
2. User enters their email address
3. System generates a secure reset token and sends an email
4. User clicks the link in the email
5. User enters a new password
6. Password is updated and user can login with new credentials

## Configuration Required

### Email Settings (Required)
You need to configure the email settings in your `appsettings.Development.json` (for development) and `appsettings.Production.json` (for production):

```json
"EmailSettings": {
  "SmtpHost": "smtp.gmail.com",
  "SmtpPort": "587",
  "SmtpUser": "your-actual-email@gmail.com",
  "SmtpPassword": "your-app-password",
  "FromEmail": "your-actual-email@gmail.com",
  "FromName": "GMAO System"
}
```

### Gmail Configuration (if using Gmail)
1. Go to your Google Account settings
2. Navigate to Security → 2-Step Verification (enable if not already)
3. Go to Security → App passwords
4. Generate a new app password for "Mail"
5. Use this 16-character password as `SmtpPassword`

### Other Email Providers
- **Outlook/Office 365:**
  - SmtpHost: "smtp.office365.com"
  - SmtpPort: "587"
  
- **SendGrid:**
  - SmtpHost: "smtp.sendgrid.net"
  - SmtpPort: "587"
  - SmtpUser: "apikey"
  - SmtpPassword: your SendGrid API key

## Files Created/Modified

### Backend (API)

#### New Files:
- `API/Services/IEmailService.cs` - Email service interface
- `API/Services/EmailService.cs` - Email service implementation with HTML template
- `API/DTOs/ForgotPasswordDto.cs` - DTO for forgot password request
- `API/DTOs/ResetPasswordDto.cs` - DTO for reset password request
- `API/DTOs/ValidateTokenDto.cs` - DTO for token validation

#### Modified Files:
- `API/Controllers/AccountController.cs` - Added 3 new endpoints:
  - `POST /api/account/forgot-password`
  - `POST /api/account/reset-password`
  - `POST /api/account/validate-reset-token`
- `API/Program.cs` - Registered EmailService
- `API/appsettings.Development.json` - Added EmailSettings and ClientUrl
- `API/appsettings.Production.json` - Added EmailSettings and ClientUrl

### Frontend (Angular)

#### New Files:
- `client/src/app/features/auth/forgot-password/`
  - `forgot-password.component.ts`
  - `forgot-password.component.html`
  - `forgot-password.component.scss`
  
- `client/src/app/features/auth/reset-password/`
  - `reset-password.component.ts`
  - `reset-password.component.html`
  - `reset-password.component.scss`

#### Modified Files:
- `client/src/app/core/services/auth.service.ts` - Added methods:
  - `forgotPassword(email)`
  - `resetPassword(data)`
  - `validateResetToken(email, token)`
- `client/src/app/app.routes.ts` - Added routes for forgot-password and reset-password
- `client/src/app/features/auth/login/login.component.ts` - Added RouterLink import
- `client/src/app/features/auth/login/login.component.html` - Updated forgot password link

## Security Features

1. **Token Expiration:** Reset tokens expire after 1 hour (ASP.NET Identity default)
2. **Email Enumeration Prevention:** Same response message whether email exists or not
3. **Secure Token Generation:** Uses ASP.NET Identity's built-in token provider
4. **Password Requirements:** 
   - Minimum 6 characters
   - At least one uppercase letter
   - At least one lowercase letter
   - At least one number
5. **Token Validation:** Token is validated before allowing password reset

## Testing the Feature

1. Start the API: `cd API && dotnet run`
2. Start the Angular app: `cd client && ng serve`
3. Go to `http://localhost:4200/login`
4. Click "Mot de passe oublié?"
5. Enter a registered email
6. Check your email inbox (and spam folder)
7. Click the reset link
8. Enter your new password
9. Login with the new password

## Troubleshooting

### Email Not Sending
- Verify SMTP credentials are correct
- Check if your email provider requires app-specific passwords
- Ensure less secure app access is enabled (if applicable)
- Check the API console logs for error messages

### Reset Link Not Working
- Ensure `ClientUrl` in appsettings matches your Angular app URL
- Check if the token hasn't expired (valid for 1 hour)
- Verify the email wasn't URL-encoded incorrectly

### Password Not Updating
- Ensure new password meets all requirements
- Check the API logs for validation errors
