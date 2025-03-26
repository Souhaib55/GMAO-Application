using System;

namespace Core.Entities;

public class FamilleEquipment
{
    public int Id { get; set; }
    public string LibelleFamille { get; set; }

    // Navigation property for the one-to-many relationship
    public ICollection<Equipment> Equipments { get; set; }
}

// This defines a one-to-many relationship 
// where one family can have multiple equipments, 
// which is appropriate.