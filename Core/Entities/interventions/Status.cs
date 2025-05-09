// 1. New Status entity (Core/Entities/interventions/Status.cs)
namespace Core.Entities
{
    public class Status
    {
        public int Id { get; set; }
        public string Statut { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public bool IsActif { get; set; } = true;
        
        // Navigation property for interventions with this status
        public ICollection<DemandeIntervention> DemandeInterventions { get; set; } = new List<DemandeIntervention>();
    }
}
