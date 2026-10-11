namespace Core.Entities
{
    /// <summary>File attached to an equipment, a work order or a purchase order.</summary>
    public class PieceJointe
    {
        public const string EntiteEquipement = "Equipement";
        public const string EntiteIntervention = "Intervention";
        public const string EntiteBonCommande = "BonCommande";

        public int Id { get; set; }
        public string Entite { get; set; } = string.Empty;
        public int EntiteId { get; set; }
        public string NomFichier { get; set; } = string.Empty;
        public string ContentType { get; set; } = "application/octet-stream";
        public long Taille { get; set; }
        public byte[] Donnees { get; set; } = Array.Empty<byte>();
        public DateTime DateAjout { get; set; }
        public int? AjouteParId { get; set; }
    }

    /// <summary>Audit trail: who did what, on which record, and when.</summary>
    public class JournalActivite
    {
        public long Id { get; set; }
        public DateTime Date { get; set; }
        public int? UtilisateurId { get; set; }
        public string? UtilisateurNom { get; set; }
        public string Entite { get; set; } = string.Empty;
        public int? EntiteId { get; set; }
        public string Action { get; set; } = string.Empty;
        public string? Details { get; set; }
    }

    /// <summary>Application-wide setting edited by the supervisor (e.g. Power BI report links).</summary>
    public class ParametreApplication
    {
        public string Cle { get; set; } = string.Empty;
        public string? Valeur { get; set; }
        public DateTime DateModification { get; set; }
    }
}
