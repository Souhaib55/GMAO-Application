namespace Core.Entities
{
    /// <summary>A physical store room (magasin principal, magasin atelier…).</summary>
    public class Magasin
    {
        public int Id { get; set; }
        public string Code { get; set; } = string.Empty;
        public string Nom { get; set; } = string.Empty;
        public string? Description { get; set; }
        public bool IsActif { get; set; } = true;
        public DateTime DateCreation { get; set; }
    }

    /// <summary>Supplier of spare parts, consumables and services.</summary>
    public class Fournisseur
    {
        public int Id { get; set; }
        public string Code { get; set; } = string.Empty;
        public string Nom { get; set; } = string.Empty;
        public string? Contact { get; set; }
        public string? Telephone { get; set; }
        public string? Email { get; set; }
        public string? Adresse { get; set; }
        // Usual lead time, used to suggest a delivery date on purchase orders
        public int? DelaiLivraisonJours { get; set; }
        public string? Notes { get; set; }
        public bool IsActif { get; set; } = true;
        public DateTime DateCreation { get; set; }
    }

    /// <summary>
    /// Every change of an article's quantity on hand. Piece.Quantite_Stock is the
    /// running balance; it is only changed together with a movement row.
    /// </summary>
    public class MouvementStock
    {
        public const string TypeEntree = "Entrée";
        public const string TypeSortie = "Sortie";
        public const string TypeAjustement = "Ajustement";
        public const string TypeInventaireInitial = "Inventaire initial";

        public int Id { get; set; }
        public int IdPiece { get; set; }
        public Piece Piece { get; set; } = null!;
        public string Type { get; set; } = TypeEntree;
        // Signed quantity: positive for an entry, negative for an issue
        public int Quantite { get; set; }
        public int StockApres { get; set; }
        public decimal? PrixUnitaire { get; set; }
        public DateTime Date { get; set; }
        public string? Motif { get; set; }
        public int? IdDemandeIntervention { get; set; }
        public DemandeIntervention? DemandeIntervention { get; set; }
        public int? IdBonCommande { get; set; }
        public BonCommande? BonCommande { get; set; }
        public int? UtilisateurId { get; set; }
        public Users? Utilisateur { get; set; }
    }
}
