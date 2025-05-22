namespace Core.Entities
{
    public class DemandeIntervention
    {
        public int IdDemandeIntervention { get; set; }
        public string Titre { get; set; } = string.Empty;
        public DateTime DateCreation { get; set; }
        public byte[]? FileData { get; set; }
        public string? FileName { get; set; }
        public string? ContentType { get; set; }
        public bool MachineArretee { get; set; }

        // Keep the existing Etat for backward compatibility
        public int IDEtat { get; set; }
        public Etat Etat { get; set; } = null!;

        // Add the new Status relationship
        public int StatusId { get; set; }
        public Status Status { get; set; } = null!;

        public int IDTypeIntervention { get; set; }
        public TypeIntervention TypeIntervention { get; set; } = null!;
        public int IDUrgence { get; set; }
        public Urgence Urgence { get; set; } = null!;
        public int IDChaineProduction { get; set; }
        public ChaineProduction ChaineProduction { get; set; } = null!;
        public int IDPanne { get; set; }
        public Panne Panne { get; set; } = null!;
        public int DemandeursID { get; set; }
        public Users Demandeur { get; set; } = null!;
        public int? DestinatairesID { get; set; }
        public Users? Destinataire { get; set; } = null!;
        public bool IsActif { get; set; }

        // Add fields to track workflow actions
        public DateTime? DateAssignation { get; set; }
        public DateTime? DateRealisation { get; set; }
        public DateTime? DateCloture { get; set; }
        public string? RaisonAnnulation { get; set; }

        public DateTime? DatePriseEnCharge { get; set; }
        public DateTime? DateResolution { get; set; }
        
    }
}