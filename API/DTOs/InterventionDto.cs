namespace API.DTOs
{
    public class InterventionDto
    {
        public int IdDemandeIntervention { get; set; }
        public string Titre { get; set; } = string.Empty;
        public DateTime DateCreation { get; set; }
        public string? FileName { get; set; }
        public bool MachineArretee { get; set; }
        public int IDEtat { get; set; }
        public int IDTypeIntervention { get; set; }
        public int IDUrgence { get; set; }
        public int IDChaineProduction { get; set; }
        public int DemandeursID { get; set; }
        public int DestinatairesID { get; set; }
        public bool IsActif { get; set; }
    }
}