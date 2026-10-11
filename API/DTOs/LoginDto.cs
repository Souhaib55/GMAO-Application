using System.ComponentModel.DataAnnotations;

namespace API.DTOs;

public class LoginDto
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string Password { get; set; } = string.Empty;

    // Keeps the session cookie after the browser is closed
    public bool RememberMe { get; set; }
}