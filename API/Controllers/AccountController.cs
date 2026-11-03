using System;
using System.Threading.Tasks;
using API.DTOs;
using API.Services;
using Core.Entities;
using Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.RateLimiting;
using System.Linq;
using Microsoft.EntityFrameworkCore;

namespace API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AccountController : ControllerBase
    {
        private readonly SignInManager<AppUser> _signInManager;
        private readonly UserManager<AppUser> _userManager;
        private readonly StoreContext _storeContext;
        private readonly IEmailService _emailService;
        private readonly IConfiguration _configuration;

        public AccountController(
            SignInManager<AppUser> signInManager,
            UserManager<AppUser> userManager,
            StoreContext storeContext,
            IEmailService emailService,
            IConfiguration configuration)
        {
            _signInManager = signInManager;
            _userManager = userManager;
            _storeContext = storeContext;
            _emailService = emailService;
            _configuration = configuration;
        }

        // Accounts are created by a supervisor from the user management screen;
        // there is no public self-registration on the factory network.
        [HttpPost("register")]
        [Authorize(Roles = "Superviseur")]
        public async Task<ActionResult> Register(RegisterDto registerDto)
        {
            if (registerDto.RoleId is < 1 or > 3)
                return BadRequest(new { message = "Rôle invalide." });
            if (await _storeContext.Users.AnyAsync(u => u.Email == registerDto.Email && u.IsActif))
                return BadRequest(new { message = "Un utilisateur avec cet email existe déjà." });

            var appUser = new AppUser
            {
                FirstName = registerDto.FirstName,
                LastName = registerDto.LastName,
                Email = registerDto.Email,
                UserName = registerDto.Email
            };

            var result = await _userManager.CreateAsync(appUser, registerDto.Password);
            if (!result.Succeeded)
            {
                foreach (var error in result.Errors)
                {
                    ModelState.AddModelError(error.Code, error.Description);
                }
                return ValidationProblem();
            }

            string roleName = GetRoleNameFromId(registerDto.RoleId);
            var roleResult = await _userManager.AddToRoleAsync(appUser, roleName);
            if (!roleResult.Succeeded)
            {
                foreach (var error in roleResult.Errors)
                {
                    ModelState.AddModelError(error.Code, error.Description);
                }
                return ValidationProblem();
            }

            var user = new Users
            {
                AppUserId = appUser.Id,
                Nom = registerDto.LastName,
                Prenom = registerDto.FirstName,
                Email = registerDto.Email,
                DateCreation = DateTime.Now,
                DateModification = DateTime.Now,
                IsActif = true,
                IDRole = registerDto.RoleId
            };
            _storeContext.Users.Add(user);
            await _storeContext.SaveChangesAsync();

            return Ok(new { Message = "User registered successfully" });
        }

        private string GetRoleNameFromId(int roleId)
        {
            return roleId switch
            {
                1 => "Superviseur",
                2 => "Demandeur",
                3 => "Utilisateur",
                _ => throw new ArgumentException("Invalid roleId")
            };
        }

        private const string InvalidCredentials = "Email ou mot de passe incorrect.";

        [HttpPost("login")]
        [AllowAnonymous]
        [EnableRateLimiting("auth")]
        public async Task<ActionResult> Login(LoginDto loginDto)
        {
            // If already authenticated, sign out first to allow fresh login
            if (User.Identity?.IsAuthenticated == true)
            {
                await _signInManager.SignOutAsync();
            }

            // Same message whether the email or the password is wrong,
            // so the login form cannot be used to discover accounts.
            var user = await _userManager.FindByEmailAsync(loginDto.Email);
            if (user == null) return Unauthorized(new { message = InvalidCredentials });

            // Password first: whether an account exists or is deactivated is only revealed to
            // someone who knows its password (no account discovery through the login form).
            var check = await _signInManager.CheckPasswordSignInAsync(user, loginDto.Password, lockoutOnFailure: true);
            if (check.IsLockedOut)
                return Unauthorized(new { message = "Compte temporairement verrouillé après plusieurs tentatives. Réessayez dans 15 minutes." });
            if (!check.Succeeded) return Unauthorized(new { message = InvalidCredentials });

            var userEntity = await _storeContext.Users
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.AppUserId == user.Id);
            if (userEntity == null || !userEntity.IsActif)
                return Unauthorized(new { message = "Ce compte est désactivé. Contactez votre responsable maintenance." });

            await _signInManager.SignInAsync(user, loginDto.RememberMe);

            var roles = await _userManager.GetRolesAsync(user);
            var role = roles.FirstOrDefault();

            return Ok(new
            {
                userId = user.Id,
                email = user.Email,
                firstName = user.FirstName,
                lastName = user.LastName,
                role = role,
                internalId = userEntity.ID
            });
        }

        [HttpPost("logout")]
        [AllowAnonymous]
        public async Task<ActionResult> Logout()
        {
            await _signInManager.SignOutAsync();
            return NoContent();
        }

        [HttpGet("user-info")]
        [AllowAnonymous]
        public async Task<ActionResult> GetUserInfo()
        {
            if (User.Identity?.IsAuthenticated != true) return Unauthorized();

            var user = await _userManager.GetUserAsync(User);
            if (user == null) return Unauthorized();

            var roles = await _userManager.GetRolesAsync(user);
            var role = roles.FirstOrDefault();

            // A deactivated account loses its session immediately
            var userEntity = await _storeContext.Users.FirstOrDefaultAsync(u => u.AppUserId == user.Id);
            if (userEntity == null || !userEntity.IsActif)
            {
                await _signInManager.SignOutAsync();
                return Unauthorized();
            }

            return Ok(new
            {
                user.Id,
                user.FirstName,
                user.LastName,
                user.Email,
                Role = role,
                InternalId = userEntity.ID
            });
        }

        [HttpGet("auth-status")]
        [AllowAnonymous]
        public ActionResult GetAuthState()
        {
            return Ok(new { isAuthenticated = User.Identity?.IsAuthenticated ?? false });
        }

        [HttpPost("forgot-password")]
        [AllowAnonymous]
        [EnableRateLimiting("auth")]
        public async Task<ActionResult> ForgotPassword(ForgotPasswordDto dto)
        {
            const string genericAnswer = "Si un compte avec cet email existe, un lien de réinitialisation a été envoyé.";
            var user = await _userManager.FindByEmailAsync(dto.Email);
            var userEntity = user == null ? null : await _storeContext.Users.FirstOrDefaultAsync(u => u.AppUserId == user.Id);

            // Always the same answer, so the form cannot be used to discover accounts
            if (user == null || userEntity == null || !userEntity.IsActif)
            {
                return Ok(new { message = genericAnswer });
            }

            // Generate password reset token
            var token = await _userManager.GeneratePasswordResetTokenAsync(user);
            
            // Get the client URL for password reset
            var clientUrl = _configuration["ClientUrl"] ?? "http://localhost:4200";
            var resetUrl = $"{clientUrl}/reset-password";

            try
            {
                await _emailService.SendPasswordResetEmailAsync(user.Email!, token, resetUrl);
            }
            catch (Exception ex)
            {
                // Logged for the administrator; the caller still gets the generic answer
                HttpContext.RequestServices.GetRequiredService<ILogger<AccountController>>()
                    .LogError(ex, "Password reset email could not be sent");
            }

            return Ok(new { message = genericAnswer });
        }

        [HttpPost("reset-password")]
        [AllowAnonymous]
        [EnableRateLimiting("auth")]
        public async Task<ActionResult> ResetPassword(ResetPasswordDto dto)
        {
            var user = await _userManager.FindByEmailAsync(dto.Email);
            // A deactivated account cannot get a new password through an old link
            var actif = user != null && await _storeContext.Users.AnyAsync(u => u.AppUserId == user.Id && u.IsActif);
            if (user == null || !actif)
            {
                return BadRequest(new { message = "Le lien de réinitialisation est invalide ou a expiré." });
            }

            var result = await _userManager.ResetPasswordAsync(user, dto.Token, dto.NewPassword);
            
            if (!result.Succeeded)
            {
                var errors = result.Errors.Select(e => e.Description).ToList();
                
                // Check if it's a token error
                if (errors.Any(e => e.Contains("token") || e.Contains("Token")))
                {
                    return BadRequest(new { message = "Le lien de réinitialisation est invalide ou a expiré." });
                }
                
                return BadRequest(new { message = "Erreur lors de la réinitialisation du mot de passe.", errors });
            }

            return Ok(new { message = "Votre mot de passe a été réinitialisé avec succès." });
        }

        [HttpPost("validate-reset-token")]
        [AllowAnonymous]
        [EnableRateLimiting("auth")]
        public async Task<ActionResult> ValidateResetToken([FromBody] ValidateTokenDto dto)
        {
            var user = await _userManager.FindByEmailAsync(dto.Email);
            if (user == null)
            {
                return BadRequest(new { valid = false, message = "Lien de réinitialisation invalide." });
            }

            // Try to verify the token by attempting a verification
            var isValid = await _userManager.VerifyUserTokenAsync(
                user, 
                _userManager.Options.Tokens.PasswordResetTokenProvider, 
                "ResetPassword", 
                dto.Token);

            if (!isValid)
            {
                return BadRequest(new { valid = false, message = "Le lien de réinitialisation est invalide ou a expiré." });
            }

            return Ok(new { valid = true });
        }
    }
}