namespace Core.Entities;

public class EquipmentCriticite
{
    public int Id { get; set; }
    public string CriticiteLevel { get; set; } // normal, critical, urgent, very urgent

    // Navigation property for the one-to-many relationship
    public ICollection<Equipment> Equipments { get; set; }
}