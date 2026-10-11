namespace Core.Entities
{
    /// <summary>Time spent by a technician on a work order (labour cost = hours × hourly rate).</summary>
    public class InterventionTemps
    {
        public int Id { get; set; }
        public int IdDemandeIntervention { get; set; }
        public DemandeIntervention DemandeIntervention { get; set; } = null!;
        public int IdTechnicien { get; set; }
        public Users Technicien { get; set; } = null!;
        public DateTime Debut { get; set; }
        public DateTime? Fin { get; set; }
        public int DureeMinutes { get; set; }
        // Hourly rate at the time of the entry, so later rate changes keep past costs
        public decimal? TauxHoraire { get; set; }
        public string? Commentaire { get; set; }
        public DateTime DateSaisie { get; set; }
    }

    /// <summary>Spare part consumed by a work order (issued from the store).</summary>
    public class InterventionPiece
    {
        public int Id { get; set; }
        public int IdDemandeIntervention { get; set; }
        public DemandeIntervention DemandeIntervention { get; set; } = null!;
        public int IdPiece { get; set; }
        public Piece Piece { get; set; } = null!;
        public int Quantite { get; set; }
        public decimal PrixUnitaire { get; set; }
        public DateTime Date { get; set; }
        public int? IdMouvementStock { get; set; }
    }

    /// <summary>Checklist step of a work order.</summary>
    public class InterventionTache
    {
        public int Id { get; set; }
        public int IdDemandeIntervention { get; set; }
        public DemandeIntervention DemandeIntervention { get; set; } = null!;
        public int Ordre { get; set; }
        public string Libelle { get; set; } = string.Empty;
        public bool Fait { get; set; }
        public DateTime? DateFait { get; set; }
        public int? FaitParId { get; set; }
    }
}
