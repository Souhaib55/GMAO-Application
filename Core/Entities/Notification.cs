namespace Core.Entities
{
    public class Notification
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty; // "intervention_assigned", "intervention_started", "intervention_completed", "intervention_cancelled", "intervention_closed"
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public bool IsRead { get; set; } = false;
        public DateTime? ReadAt { get; set; }
        
        // Related intervention (optional)
        public int? InterventionId { get; set; }
        public DemandeIntervention? Intervention { get; set; }
        
        // Target user who receives the notification
        public int UserId { get; set; }
        public Users User { get; set; } = null!;
        
        // User who triggered the notification (optional)
        public int? TriggeredByUserId { get; set; }
        public Users? TriggeredByUser { get; set; }
    }
}
