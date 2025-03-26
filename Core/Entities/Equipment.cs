using System;
using System.ComponentModel.DataAnnotations.Schema;

namespace Core.Entities
{
    public class Equipment 
    {
        public int Id { get; set; }
        public string Code { get; set; }
        public string Designation { get; set; }

        [Column("FamilleEquipmentId")] // Explicit column mapping

        // Foreign key to FamilleEquipment
        public int FamilleEquipmentId { get; set; }

        // Navigation property
        public FamilleEquipment? FamilleEquipment { get; set; }



    }
}