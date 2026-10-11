using API.Services;
using Core.Entities;
using Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace API.Controllers
{
    /// <summary>
    /// Documents attached to an equipment (manuals, drawings, certificates), a work
    /// order (photos, reports) or a purchase order (quotes, delivery notes).
    /// </summary>
    [ApiController]
    [Route("api/pieces-jointes")]
    public class PiecesJointesController : ControllerBase
    {
        private const long MaxFileSize = 10 * 1024 * 1024;
        private static readonly string[] AllowedExtensions =
        {
            ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".txt", ".csv", ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".zip", ".dwg"
        };
        private static readonly string[] Entites = { PieceJointe.EntiteEquipement, PieceJointe.EntiteIntervention, PieceJointe.EntiteBonCommande };

        private readonly StoreContext _context;
        private readonly ICurrentUserService _currentUser;
        private readonly IJournalService _journal;

        public PiecesJointesController(StoreContext context, ICurrentUserService currentUser, IJournalService journal)
        {
            _context = context;
            _currentUser = currentUser;
            _journal = journal;
        }

        private async Task<(bool read, bool write)> RightsAsync(CurrentUser user, string entite, int entiteId)
        {
            switch (entite)
            {
                case PieceJointe.EntiteEquipement:
                    return (!user.IsDemandeur, user.IsSuperviseur);
                case PieceJointe.EntiteBonCommande:
                    return (user.IsSuperviseur, user.IsSuperviseur);
                case PieceJointe.EntiteIntervention:
                    var d = await _context.DemandeInterventions.AsNoTracking()
                        .Where(x => x.IdDemandeIntervention == entiteId && x.IsActif)
                        .Select(x => new { x.DemandeursID, x.DestinatairesID, x.StatusId })
                        .FirstOrDefaultAsync();
                    if (d == null) return (false, false);
                    var involved = user.IsSuperviseur || d.DemandeursID == user.Id || d.DestinatairesID == user.Id;
                    var open = d.StatusId is not (DemandeInterventionController.StatusCloturee or DemandeInterventionController.StatusAnnulee);
                    return (involved, involved && (open || user.IsSuperviseur));
                default:
                    return (false, false);
            }
        }

        [HttpGet]
        public async Task<ActionResult<object>> List(string entite, int entiteId)
        {
            var user = await _currentUser.GetAsync();
            if (user == null) return Unauthorized();
            if (!Entites.Contains(entite)) return BadRequest(new { message = "Type d'objet invalide." });
            var (read, write) = await RightsAsync(user, entite, entiteId);
            if (!read) return StatusCode(403, new { message = "Accès refusé." });

            var files = await _context.PiecesJointes.AsNoTracking()
                .Where(p => p.Entite == entite && p.EntiteId == entiteId)
                .OrderByDescending(p => p.DateAjout)
                .Select(p => new { p.Id, p.NomFichier, p.ContentType, p.Taille, p.DateAjout })
                .ToListAsync();
            return Ok(new { fichiers = files, peutAjouter = write });
        }

        [HttpPost]
        [RequestSizeLimit(MaxFileSize + 64 * 1024)]
        public async Task<ActionResult> Upload([FromForm] string entite, [FromForm] int entiteId, IFormFile file)
        {
            var user = await _currentUser.GetAsync();
            if (user == null) return Unauthorized();
            if (!Entites.Contains(entite)) return BadRequest(new { message = "Type d'objet invalide." });
            var (_, write) = await RightsAsync(user, entite, entiteId);
            if (!write) return StatusCode(403, new { message = "Vous ne pouvez pas ajouter de document ici." });

            if (file == null || file.Length == 0) return BadRequest(new { message = "Fichier vide." });
            if (file.Length > MaxFileSize) return BadRequest(new { message = "Le fichier dépasse 10 Mo." });
            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!AllowedExtensions.Contains(ext)) return BadRequest(new { message = $"Type de fichier non autorisé ({string.Join(", ", AllowedExtensions)})." });

            using var ms = new MemoryStream();
            await file.CopyToAsync(ms);
            var name = Path.GetFileName(file.FileName);
            _context.PiecesJointes.Add(new PieceJointe
            {
                Entite = entite,
                EntiteId = entiteId,
                NomFichier = name.Length > 255 ? name[^255..] : name,
                ContentType = string.IsNullOrWhiteSpace(file.ContentType) || file.ContentType.Length > 100 ? "application/octet-stream" : file.ContentType,
                Taille = file.Length,
                Donnees = ms.ToArray(),
                DateAjout = DateTime.Now,
                AjouteParId = user.Id
            });
            _journal.Add(user, entite, entiteId, "Document ajouté", name);
            await _context.SaveChangesAsync();
            return Ok();
        }

        [HttpGet("{id:int}")]
        public async Task<ActionResult> Download(int id)
        {
            var user = await _currentUser.GetAsync();
            if (user == null) return Unauthorized();
            var meta = await _context.PiecesJointes.AsNoTracking().Where(p => p.Id == id)
                .Select(p => new { p.Entite, p.EntiteId }).FirstOrDefaultAsync();
            if (meta == null) return NotFound(new { message = "Document introuvable." });
            var (read, _) = await RightsAsync(user, meta.Entite, meta.EntiteId);
            if (!read) return StatusCode(403, new { message = "Accès refusé." });

            var file = await _context.PiecesJointes.AsNoTracking().FirstAsync(p => p.Id == id);
            return File(file.Donnees, file.ContentType, file.NomFichier);
        }

        [HttpDelete("{id:int}")]
        public async Task<ActionResult> Delete(int id)
        {
            var user = await _currentUser.GetAsync();
            if (user == null) return Unauthorized();
            var file = await _context.PiecesJointes.FirstOrDefaultAsync(p => p.Id == id);
            if (file == null) return NotFound(new { message = "Document introuvable." });
            var (_, write) = await RightsAsync(user, file.Entite, file.EntiteId);
            if (!write || (!user.IsSuperviseur && file.AjouteParId != user.Id))
                return StatusCode(403, new { message = "Vous ne pouvez pas supprimer ce document." });
            _context.PiecesJointes.Remove(file);
            _journal.Add(user, file.Entite, file.EntiteId, "Document supprimé", file.NomFichier);
            await _context.SaveChangesAsync();
            return Ok();
        }
    }
}
