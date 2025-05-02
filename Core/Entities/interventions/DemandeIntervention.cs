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
        public int IDEtat { get; set; }
        public Etat Etat { get; set; } = null!;
        public int IDTypeIntervention { get; set; }
        public TypeIntervention TypeIntervention { get; set; } = null!;
        public int IDUrgence { get; set; }
        public Urgence Urgence { get; set; } = null!;
        public int IDChaineProduction { get; set; }
        public ChaineProduction ChaineProduction { get; set; } = null!;
        public int DemandeursID { get; set; }
        public Users Demandeur { get; set; } = null!;
        public int? DestinatairesID { get; set; }
        public Users? Destinataire { get; set; } = null!;
        public bool IsActif { get; set; }
    }
}