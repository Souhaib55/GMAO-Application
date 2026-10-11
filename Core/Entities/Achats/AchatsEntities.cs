namespace Core.Entities
{
    /// <summary>Internal purchase request (DA), approved by the supervisor before ordering.</summary>
    public class DemandeAchat
    {
        public const string StatutSoumise = "Soumise";
        public const string StatutApprouvee = "Approuvée";
        public const string StatutRejetee = "Rejetée";
        public const string StatutCommandee = "Commandée";

        public int Id { get; set; }
        public string Numero { get; set; } = string.Empty;
        public DateTime DateDemande { get; set; }
        public int IdDemandeur { get; set; }
        public Users Demandeur { get; set; } = null!;
        public string Statut { get; set; } = StatutSoumise;
        public string? Motif { get; set; }
        public int? IdDemandeIntervention { get; set; }
        public DemandeIntervention? DemandeIntervention { get; set; }
        public DateTime? DateDecision { get; set; }
        public int? IdDecideur { get; set; }
        public string? CommentaireDecision { get; set; }
        public List<DemandeAchatLigne> Lignes { get; set; } = new();
    }

    public class DemandeAchatLigne
    {
        public int Id { get; set; }
        public int IdDemandeAchat { get; set; }
        public DemandeAchat DemandeAchat { get; set; } = null!;
        public int? IdPiece { get; set; }
        public Piece? Piece { get; set; }
        public string Designation { get; set; } = string.Empty;
        public int Quantite { get; set; }
        public decimal? PrixEstime { get; set; }
    }

    /// <summary>Purchase order (BC) sent to a supplier; its receipt adds stock.</summary>
    public class BonCommande
    {
        public const string StatutBrouillon = "Brouillon";
        public const string StatutEnvoye = "Envoyé";
        public const string StatutPartiel = "Partiellement reçu";
        public const string StatutRecu = "Reçu";
        public const string StatutAnnule = "Annulé";

        public int Id { get; set; }
        public string Numero { get; set; } = string.Empty;
        public int IdFournisseur { get; set; }
        public Fournisseur Fournisseur { get; set; } = null!;
        public int? IdDemandeAchat { get; set; }
        public DemandeAchat? DemandeAchat { get; set; }
        public DateTime DateCommande { get; set; }
        public DateTime? DateLivraisonPrevue { get; set; }
        public DateTime? DateReceptionComplete { get; set; }
        public string Statut { get; set; } = StatutBrouillon;
        public string? Notes { get; set; }
        public int? IdCreateur { get; set; }
        public DateTime DateCreation { get; set; }
        public List<BonCommandeLigne> Lignes { get; set; } = new();
    }

    public class BonCommandeLigne
    {
        public int Id { get; set; }
        public int IdBonCommande { get; set; }
        public BonCommande BonCommande { get; set; } = null!;
        public int? IdPiece { get; set; }
        public Piece? Piece { get; set; }
        public string Designation { get; set; } = string.Empty;
        public int Quantite { get; set; }
        public int QuantiteRecue { get; set; }
        public decimal PrixUnitaire { get; set; }
    }

    /// <summary>Annual maintenance budget for one cost category (optionally one production line).</summary>
    public class Budget
    {
        public const string CategorieMainOeuvre = "Main-d'œuvre";
        public const string CategoriePieces = "Pièces";
        public const string CategorieSousTraitance = "Sous-traitance";

        public int Id { get; set; }
        public int Annee { get; set; }
        public string Categorie { get; set; } = CategoriePieces;
        public int? IdChaineProduction { get; set; }
        public ChaineProduction? ChaineProduction { get; set; }
        public decimal Montant { get; set; }
        public string? Notes { get; set; }
    }
}
