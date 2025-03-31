// Core/Entities/Equipment.cs
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

    [Column("EquipmentCriticiteId")]
    public int EquipmentCriticiteId { get; set; }
    public EquipmentCriticite? EquipmentCriticite { get; set; }

    public bool IsDeleted { get; set; } = false; // New property for soft delete
}