using System.Text.Json.Serialization;

namespace API.DTOs
{
    public class InterventionDto
{
    public int IdDemandeIntervention { get; set; }
    
    [JsonPropertyName("titre")]
    public string? Titre { get; set; }
    
    [JsonPropertyName("dateCreation")]
    public DateTime DateCreation { get; set; }
    
    [JsonPropertyName("machineArretee")]
    public bool MachineArretee { get; set; }
    
    [JsonPropertyName("idEtat")]
    public int IDEtat { get; set; }
    
    [JsonPropertyName("idTypeIntervention")]
    public int IDTypeIntervention { get; set; }
    
    [JsonPropertyName("idUrgence")]
    public int IDUrgence { get; set; }
    
    [JsonPropertyName("idChaineProduction")]
    public int IDChaineProduction { get; set; }
    
    [JsonPropertyName("idPanne")]
    public int IDPanne { get; set; }
    
    [JsonPropertyName("demandeursId")]
    public int DemandeursID { get; set; }
    
    [JsonPropertyName("destinatairesId")]
    public int? DestinatairesID { get; set; }
    
    [JsonPropertyName("description")]
    public string? Description { get; set; }
    
    // Propriétés pour les actions de workflow
    public string? WorkflowAction { get; set; }
    public string? RaisonAnnulation { get; set; }
    }
}