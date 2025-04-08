namespace Core.Entities
{
    public class EquipmentCriticite
    {
        public int IdCriticite { get; set; }
        public string NomCriticite { get; set; } = string.Empty;
        public string? Description { get; set; }
        public DateTime DateCreation { get; set; }
        public DateTime? DateModification { get; set; }
        public bool IsActif { get; set; }
        public ICollection<Equipment> Equipments { get; set; } = new List<Equipment>();
        public ICollection<ModeleEquipement> Modeles { get; set; } = new List<ModeleEquipement>();
    }
}