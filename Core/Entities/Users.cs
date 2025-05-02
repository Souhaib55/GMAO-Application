using Core.Entities;

public class Users
{
    public int ID { get; set; }
    public string? AppUserId { get; set; } // Foreign key to AppUser.Id
    public AppUser AppUser { get; set; } // Navigation property
    public string Nom { get; set; } = string.Empty;
    public string Prenom { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public DateTime DateCreation { get; set; }
    public DateTime DateModification { get; set; }
    public bool IsActif { get; set; }
    public int IDRole { get; set; } // Foreign key to Role
    public Role Role { get; set; }  // Navigation property
}