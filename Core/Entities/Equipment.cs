using System.ComponentModel.DataAnnotations.Schema;

namespace Core.Entities;

public class Equipment 
{
    public int Id { get; set; }
    public string Code { get; set; }
    public string Designation { get; set; }

    [Column("FamilleEquipmentId")]
    public int FamilleEquipmentId { get; set; }
    public FamilleEquipment? FamilleEquipment { get; set; }

    [Column("EquipmentCriticiteId")] // Explicit column mapping
    public int EquipmentCriticiteId { get; set; } // Foreign key to EquipmentCriticite
    public EquipmentCriticite? EquipmentCriticite { get; set; } // Navigation property
}