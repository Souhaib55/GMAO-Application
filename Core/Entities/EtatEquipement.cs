namespace Core.Entities
{
    public class EtatEquipement
    {
        public int IdEtat { get; set; }
        public string NomEtat { get; set; } = string.Empty;
        public string? Description { get; set; }
        public DateTime DateCreation { get; set; }
        public DateTime? DateModification { get; set; }
        public bool IsActif { get; set; }
        public ICollection<Equipment> Equipments { get; set; } = new List<Equipment>();
    }
}