using System.ComponentModel.DataAnnotations;

namespace API.DTOs
{
    public class InterventionDto
    {
        public int IdDemandeIntervention { get; set; }
        
        [Required(ErrorMessage = "Titre is required")]
        public string Titre { get; set; } = string.Empty;
        
        public DateTime DateCreation { get; set; }
        
        // Nullable file-related fields - these are optional
        public string? FileName { get; set; }
        
        public bool MachineArretee { get; set; }
        
        [Required(ErrorMessage = "État is required")]
        public int IDEtat { get; set; }
        
        [Required(ErrorMessage = "Type d'intervention is required")]
        public int IDTypeIntervention { get; set; }
        
        [Required(ErrorMessage = "Urgence is required")]
        public int IDUrgence { get; set; }
        
        [Required(ErrorMessage = "Chaîne de production is required")]
        public int IDChaineProduction { get; set; }
        
        [Required(ErrorMessage = "Panne is required")]
        public int IDPanne { get; set; }
        
        [Required(ErrorMessage = "Demandeur is required")]
        public int DemandeursID { get; set; }
        
        // Nullable - not all interventions have a destinataire assigned
        public int? DestinatairesID { get; set; }
        
        public bool IsActif { get; set; } = true;
        
        // Added to support partial updates - indicates which fields should be updated
        // This won't be mapped from the form directly but can be set in the controller
        public Dictionary<string, bool>? UpdatedFields { get; set; }
    }
}