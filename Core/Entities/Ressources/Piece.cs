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
        public int IDConstructeur { get; set; }
        public Constructeur Constructeur { get; set; } = null!;
        public int IDCriticitePiece { get; set; }
        public CriticitePiece CriticitePiece { get; set; } = null!;
        public int Quantite_Stock { get; set; }
        // Reorder point: an alert is raised when stock falls to or below it
        public int SeuilMinimum { get; set; }
        public decimal PrixUnitaire { get; set; }
        public DateTime DateCreation { get; set; }
        public DateTime? DateModification { get; set; }
        public bool IsActif { get; set; }
    }
}