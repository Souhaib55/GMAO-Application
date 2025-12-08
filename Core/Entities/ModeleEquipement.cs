namespace Core.Entities
{
    public class ModeleEquipement
    {
        public int IdModele { get; set; }
        public string NomModele { get; set; } = string.Empty;
        public int? IdMarque { get; set; }
        public Marque? Marque { get; set; }
        public int? IdFamille { get; set; }
        public FamilleEquipment? Famille { get; set; }
        public int? IdCriticite { get; set; }
        public EquipmentCriticite? Criticite { get; set; }
        public DateTime DateCreation { get; set; }
        public DateTime? DateModification { get; set; }
        public bool IsActif { get; set; }
        public string? Commentaire { get; set; }
        public ICollection<Equipment> Equipments { get; set; } = new List<Equipment>();
    }
}