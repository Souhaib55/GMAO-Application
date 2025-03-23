using System;
using System.Security.Claims;
using API.DTOs;
using API.Extensions;
using Core.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace API.Controllers;

[ApiController]
[Route("api/[controller]")]  // these two lines shall follow each controller class

public class AccountController(SignInManager<AppUser> signInManager) : ControllerBase
{

    [HttpPost("register")]
    public async Task<ActionResult> Register(RegisterDto registerDto)
    {
       

        // create new user
        var user = new AppUser
        {
            FirstName = registerDto.FirstName,
            LastName = registerDto.LastName,
            Email = registerDto.Email,
            UserName = registerDto.Email // name of the user based on his email
        };

        var result = await signInManager.UserManager.CreateAsync(user, registerDto.Password);

        if (!result.Succeeded)
        {
            foreach (var error in result.Errors)
            {
                ModelState.AddModelError(error.Code , error.Description);
            }
            return ValidationProblem(); 
        }

        return Ok();  
    }

  
    [HttpPost("logout")]
    public async Task<ActionResult> Logout()
    {
        await signInManager.SignOutAsync(); // logout from AspNet Identity
        return NoContent();
    }

    
    [HttpGet("user-info")]   
    public async Task<ActionResult> GetUserInfo()
    {
        if (User.Identity?.IsAuthenticated == false) return NoContent();

        var user = await signInManager.UserManager.GetUserByEmail(User);

        return Ok(new
        {
            user.FirstName,
            user.LastName,
            user.Email
        });
    }

    [HttpGet("auth-status")]
    public ActionResult GetAuthState()
    {
        return Ok(new { isAuthenticated = User.Identity?.IsAuthenticated ?? false});
    }

        

}
