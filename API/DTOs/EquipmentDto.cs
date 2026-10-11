using System;
using System.ComponentModel.DataAnnotations;

namespace API.DTOs
{
    public class EquipmentDto
    {
        public int IdEquipement { get; set; }

        [Required]
        public string CodeEquipement { get; set; }

        [Required]
        public string Designation { get; set; }

        public string? Description { get; set; }

        public int? IdCriticite { get; set; }  // Nullable to support optional relationship
        public int? IdEtat { get; set; }      // Nullable to support optional relationship
        public int? IdFamille { get; set; }   // Nullable to support optional relationship
        public int? IdModele { get; set; }    // Nullable to support optional relationship
        public int? IdGroupe { get; set; }    // Nullable to support optional relationship
        public int? IdChaineProduction { get; set; } // Production line the machine is installed on

        public DateTime? DateInstallation { get; set; }
        public DateTime? DateMiseEnService { get; set; }
        public string? NumeroSerie { get; set; }
        public bool SousGarantie { get; set; }
        public DateTime? DateAchat { get; set; }
        public DateTime? DateFinGarantie { get; set; }
        public DateTime? DateConstruction { get; set; }
        public decimal? CoutAchat { get; set; }
        public DateTime DateCreation { get; set; }
        public DateTime? DateModification { get; set; }
        public bool IsDeleted { get; set; }
    }
}