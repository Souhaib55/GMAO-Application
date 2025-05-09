// 6. Create a StatusDto
namespace API.DTOs
{
    public class StatusDto
    {
        public int Id { get; set; }
        public string Statut { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public bool IsActif { get; set; } = true;
    }
}