using System;
using System.Threading.Tasks;
using API.DTOs;
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

        public AccountController(
            SignInManager<AppUser> signInManager,
            UserManager<AppUser> userManager,
            StoreContext storeContext)
        {
            _signInManager = signInManager;
            _userManager = userManager;
            _storeContext = storeContext;
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
            if (User.Identity.IsAuthenticated)
            {
                return BadRequest("Already logged in");
            }

            var user = await _userManager.FindByEmailAsync(loginDto.Email);
            if (user == null) return Unauthorized("Invalid login attempt.");

            var result = await _signInManager.PasswordSignInAsync(user.UserName, loginDto.Password, true, false);
            if (!result.Succeeded) return Unauthorized("Invalid login attempt.");

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
    }
}