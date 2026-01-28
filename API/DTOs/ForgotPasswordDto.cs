using System.ComponentModel.DataAnnotations;

namespace API.DTOs
{
    public class ForgotPasswordDto
    {
        [Required(ErrorMessage = "L'email est requis")]
        [EmailAddress(ErrorMessage = "Format d'email invalide")]
        public string Email { get; set; } = string.Empty;
    }
}
