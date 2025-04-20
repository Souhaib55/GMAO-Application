namespace Core.Entities
{
    public class Constructeur
    {
        public int IDConstructeur { get; set; }
        public string NomConstructeur { get; set; } = string.Empty;
        public string? Contact { get; set; }
        public DateTime DateCreation { get; set; }
        public DateTime? DateModification { get; set; }
        public bool IsActif { get; set; }
        public ICollection<Piece> Pieces { get; set; } = new List<Piece>();
    }
}