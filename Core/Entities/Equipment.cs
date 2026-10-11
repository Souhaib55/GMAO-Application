namespace Core.Entities
{
    public class Equipment
    {
        public int IdEquipement { get; set; }
        public string CodeEquipement { get; set; } = string.Empty;
        public string Designation { get; set; } = string.Empty;
        public string? Description { get; set; }
        public int? IdCriticite { get; set; }              // Changed to int?
        public EquipmentCriticite? Criticite { get; set; } // Changed to nullable
        public int? IdEtat { get; set; }                  // Changed to int?
        public EtatEquipement? Etat { get; set; }         // Changed to nullable
        public int? IdFamille { get; set; }               // Changed to int?
        public FamilleEquipment? Famille { get; set; }    // Changed to nullable
        public int? IdModele { get; set; }                // Changed to int?
        public ModeleEquipement? Modele { get; set; }     // Changed to nullable
        public int? IdGroupe { get; set; }                // Changed to int?
        public GroupeEquipement? Groupe { get; set; }     // Changed to nullable
        // Production line the machine is installed on
        public int? IdChaineProduction { get; set; }
        public ChaineProduction? ChaineProduction { get; set; }
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