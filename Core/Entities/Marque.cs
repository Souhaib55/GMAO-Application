namespace Core.Entities
{
    public class Marque
    {
        public int IdMarque { get; set; }
        public string NomMarque { get; set; } = string.Empty;
        public DateTime DateCreation { get; set; }
        public DateTime? DateModification { get; set; }
        public bool IsActif { get; set; }
        public ICollection<ModeleEquipement> Modeles { get; set; } = new List<ModeleEquipement>();
    }
}