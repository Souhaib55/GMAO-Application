namespace Core.Entities
{
    public class Users
    {
        public int ID { get; set; }
        public string Nom { get; set; } = string.Empty;
        public string Prenom { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public DateTime DateCreation { get; set; }
        public DateTime DateModification { get; set; }
        public bool IsActif { get; set; }
    }
}