using System.ComponentModel.DataAnnotations;

namespace API.DTOs;

public class RessourceDto
{
    public int IDPiece { get; set; }
        [Required]
        public string CodePiece { get; set; } = string.Empty;
        [Required]
        public string Designation { get; set; } = string.Empty;
        public string? Description { get; set; }
        [Required]
        public int IDFamillePiece { get; set; }
        [Required]
        public int IDConstructeur { get; set; }
        [Required]
        public int IDCriticitePiece { get; set; }
        public int Quantite_Stock { get; set; }
        public decimal PrixUnitaire { get; set; }
        public DateTime DateCreation { get; set; }
        public DateTime? DateModification { get; set; }
        public bool IsActif { get; set; }

}
