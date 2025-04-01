namespace Core.Entities;

public class Equipment 
{
    public int Id { get; set; }
    public string Code { get; set; }
    public string Designation { get; set; }
    public int FamilleEquipmentId { get; set; }
    public FamilleEquipment? FamilleEquipment { get; set; }
    public int EquipmentCriticiteId { get; set; }
    public EquipmentCriticite? EquipmentCriticite { get; set; }
    public bool IsDeleted { get; set; } = false;
    public DateTime CreatedOn { get; set; } = DateTime.Now; // New property with default value
}