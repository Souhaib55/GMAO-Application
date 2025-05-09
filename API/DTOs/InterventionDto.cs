public class InterventionDto
{
    public int IdDemandeIntervention { get; set; }
    public string? Titre { get; set; }
    public DateTime DateCreation { get; set; }
    public bool MachineArretee { get; set; }
    public int IDEtat { get; set; }
    public int IDTypeIntervention { get; set; }
    public int IDUrgence { get; set; }
    public int IDChaineProduction { get; set; }
    public int IDPanne { get; set; }
    public int DemandeursID { get; set; }
    public int? DestinatairesID { get; set; }
    public string? Description { get; set; }
    
    // Propriétés pour les actions de workflow
    public string? WorkflowAction { get; set; }
    public string? RaisonAnnulation { get; set; }
}