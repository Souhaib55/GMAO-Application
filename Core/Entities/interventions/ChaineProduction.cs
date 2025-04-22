namespace Core.Entities
{
    public class ChaineProduction
    {
        public int IDChaineProduction { get; set; }
        public string Libelle { get; set; } = string.Empty;
        public DateTime DateCreation { get; set; }
        public DateTime? DateModification { get; set; }
        public bool IsActif { get; set; }
    }
}