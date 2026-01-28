using System.ComponentModel.DataAnnotations;

namespace API.DTOs
{
    public class ValidateTokenDto
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        public string Token { get; set; } = string.Empty;
    }
}
