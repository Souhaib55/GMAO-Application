namespace API.DTOs;

public class UpdateUserDto
{
    public int Id { get; set; }
    public string Prenom { get; set; } = string.Empty;
    public string Nom { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public int IdRole { get; set; }
    public string? AppUserId { get; set; }
    public bool IsActif { get; set; } = true;
}
