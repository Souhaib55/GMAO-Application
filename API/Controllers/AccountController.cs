using System;
using System.Threading.Tasks;
using API.DTOs;
using API.Services;
using Core.Entities;
using Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Identity;
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

        [HttpPost("register")]
        public async Task<ActionResult> Register(RegisterDto registerDto)
        {
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

        [HttpPost("login")]
        public async Task<ActionResult> Login(LoginDto loginDto)
        {
            // If already authenticated, sign out first to allow fresh login
            if (User.Identity?.IsAuthenticated == true)
            {
                await _signInManager.SignOutAsync();
            }

            var user = await _userManager.FindByEmailAsync(loginDto.Email);
            if (user == null) return Unauthorized("Email incorrect.");

            var result = await _signInManager.PasswordSignInAsync(user.UserName, loginDto.Password, true, false);
            if (!result.Succeeded) return Unauthorized("Mot de passe incorrect.");

            var roles = await _userManager.GetRolesAsync(user);
            var role = roles.FirstOrDefault();

            var userEntity = await _storeContext.Users
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.AppUserId == user.Id);
            
            if (userEntity == null) return BadRequest("User entity not found");

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
        public async Task<ActionResult> Logout()
        {
            await _signInManager.SignOutAsync();
            return NoContent();
        }

        [HttpGet("user-info")]
        public async Task<ActionResult> GetUserInfo()
        {
            if (User.Identity?.IsAuthenticated != true) return NoContent();

            var user = await _userManager.GetUserAsync(User);
            if (user == null)
            {
                Console.WriteLine("No user found for the current session.");
                return NoContent();
            }

            var roles = await _userManager.GetRolesAsync(user);
            Console.WriteLine($"User {user.Email} (ID: {user.Id}) roles: {string.Join(", ", roles)}");
            var role = roles.FirstOrDefault();

            var userEntity = await _storeContext.Users.FirstOrDefaultAsync(u => u.AppUserId == user.Id);
            if (userEntity == null) return NotFound("User entity not found");

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
        public ActionResult GetAuthState()
        {
            return Ok(new { isAuthenticated = User.Identity?.IsAuthenticated ?? false });
        }

        [HttpPost("forgot-password")]
        public async Task<ActionResult> ForgotPassword(ForgotPasswordDto dto)
        {
            var user = await _userManager.FindByEmailAsync(dto.Email);
            
            // Always return success to prevent email enumeration attacks
            if (user == null)
            {
                return Ok(new { message = "Si un compte avec cet email existe, un lien de réinitialisation a été envoyé." });
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
                Console.WriteLine($"Failed to send email: {ex.Message}");
                return StatusCode(500, new { message = "Erreur lors de l'envoi de l'email. Veuillez réessayer." });
            }

            return Ok(new { message = "Si un compte avec cet email existe, un lien de réinitialisation a été envoyé." });
        }

        [HttpPost("reset-password")]
        public async Task<ActionResult> ResetPassword(ResetPasswordDto dto)
        {
            var user = await _userManager.FindByEmailAsync(dto.Email);
            if (user == null)
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