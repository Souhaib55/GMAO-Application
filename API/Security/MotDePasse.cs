using Core.Entities;
using Microsoft.AspNetCore.Identity;

namespace API.Security;

/// <summary>
/// Refuses passwords that are easy to guess even when they meet the length and character
/// rules: the person's own name or e-mail, or the words everyone tries first.
/// Applies when a password is created, changed or reset; existing passwords keep working.
/// </summary>
public sealed class MotDePasseValidator : IPasswordValidator<AppUser>
{
    private static readonly string[] Courants =
    {
        "password", "motdepasse", "azerty", "qwerty", "123456", "abcdef", "bonjour", "soleil",
        "admin", "gmao", "maintenance", "tunisie", "welcome", "changeme"
    };

    public Task<IdentityResult> ValidateAsync(UserManager<AppUser> manager, AppUser user, string? password)
    {
        if (string.IsNullOrEmpty(password)) return Task.FromResult(IdentityResult.Success);
        var p = password.ToLowerInvariant();
        var personnel = new[] { user.FirstName, user.LastName, user.Email?.Split('@')[0] }
            .Where(x => !string.IsNullOrWhiteSpace(x) && x!.Length >= 3)
            .Select(x => x!.ToLowerInvariant());
        if (personnel.Any(p.Contains))
            return Task.FromResult(IdentityResult.Failed(new IdentityError { Code = "MotDePassePersonnel", Description = "Le mot de passe ne doit pas contenir votre nom ni votre e-mail." }));
        if (Courants.Any(p.Contains))
            return Task.FromResult(IdentityResult.Failed(new IdentityError { Code = "MotDePasseCourant", Description = "Ce mot de passe est trop courant : choisissez une phrase ou des mots moins prévisibles." }));
        return Task.FromResult(IdentityResult.Success);
    }
}

/// <summary>Identity error messages in French (they reach the supervisor's user screen).</summary>
public sealed class ErreursIdentiteFr : IdentityErrorDescriber
{
    public override IdentityError PasswordTooShort(int length) => new() { Code = nameof(PasswordTooShort), Description = $"Le mot de passe doit contenir au moins {length} caractères." };
    public override IdentityError PasswordRequiresDigit() => new() { Code = nameof(PasswordRequiresDigit), Description = "Le mot de passe doit contenir au moins un chiffre." };
    public override IdentityError PasswordRequiresLower() => new() { Code = nameof(PasswordRequiresLower), Description = "Le mot de passe doit contenir au moins une minuscule." };
    public override IdentityError PasswordRequiresUpper() => new() { Code = nameof(PasswordRequiresUpper), Description = "Le mot de passe doit contenir au moins une majuscule." };
    public override IdentityError PasswordRequiresNonAlphanumeric() => new() { Code = nameof(PasswordRequiresNonAlphanumeric), Description = "Le mot de passe doit contenir au moins un caractère spécial." };
    public override IdentityError PasswordRequiresUniqueChars(int uniqueChars) => new() { Code = nameof(PasswordRequiresUniqueChars), Description = $"Le mot de passe doit contenir au moins {uniqueChars} caractères différents." };
    public override IdentityError PasswordMismatch() => new() { Code = nameof(PasswordMismatch), Description = "Mot de passe incorrect." };
    public override IdentityError InvalidToken() => new() { Code = nameof(InvalidToken), Description = "Le lien est invalide ou a expiré." };
    public override IdentityError DuplicateEmail(string email) => new() { Code = nameof(DuplicateEmail), Description = "Un compte utilise déjà cet e-mail." };
    public override IdentityError DuplicateUserName(string userName) => new() { Code = nameof(DuplicateUserName), Description = "Un compte utilise déjà cet identifiant." };
    public override IdentityError InvalidEmail(string? email) => new() { Code = nameof(InvalidEmail), Description = "L'adresse e-mail n'est pas valide." };
    public override IdentityError InvalidUserName(string? userName) => new() { Code = nameof(InvalidUserName), Description = "L'identifiant contient des caractères non autorisés." };
    public override IdentityError UserLockoutNotEnabled() => new() { Code = nameof(UserLockoutNotEnabled), Description = "Le verrouillage n'est pas activé pour ce compte." };
    public override IdentityError DefaultError() => new() { Code = nameof(DefaultError), Description = "Une erreur est survenue." };
}
