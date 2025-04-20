namespace Core.Entities
{
    public class FamillePiece
    {
        public int IDFamillePiece { get; set; }
        public string NomFamille { get; set; } = string.Empty;
        public string? Description { get; set; }
        public DateTime DateCreation { get; set; }
        public DateTime? DateModification { get; set; }
        public bool IsActif { get; set; }
        public ICollection<Piece> Pieces { get; set; } = new List<Piece>();
    }
}