namespace Core.Entities
{
    public class Piece
    {
        public int IDPiece { get; set; }
        public string CodePiece { get; set; } = string.Empty;
        public string Designation { get; set; } = string.Empty;
        public string? Description { get; set; }
        public int IDFamillePiece { get; set; }
        public FamillePiece FamillePiece { get; set; } = null!;
        // Optional: consumables and bulk supplies often have no known manufacturer
        public int? IDConstructeur { get; set; }
        public Constructeur? Constructeur { get; set; }
        public int IDCriticitePiece { get; set; }
        public CriticitePiece CriticitePiece { get; set; } = null!;
        public int Quantite_Stock { get; set; }
        // Reorder point: an alert is raised when stock falls to or below it
        public int SeuilMinimum { get; set; }
        public decimal PrixUnitaire { get; set; }
        public DateTime DateCreation { get; set; }
        public DateTime? DateModification { get; set; }
        public bool IsActif { get; set; }

        // Store (magasin) data: an article is a spare part, a consumable or a tool
        public string TypeArticle { get; set; } = "Pièce de rechange";
        public string Unite { get; set; } = "pièce";
        public int? StockMaximum { get; set; }
        public string? Emplacement { get; set; }
        public int? IdMagasin { get; set; }
        public Magasin? Magasin { get; set; }
        public int? IdFournisseur { get; set; }
        public Fournisseur? Fournisseur { get; set; }
        public string? ReferenceFournisseur { get; set; }
        public int? DelaiApproJours { get; set; }
    }
}