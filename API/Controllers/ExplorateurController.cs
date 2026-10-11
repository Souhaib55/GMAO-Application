using API.Services;
using Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace API.Controllers
{
    /// <summary>
    /// "Explorateur de données": predefined business questions answered from live data.
    /// The client chooses a question and parameter values; it never sends SQL.
    /// </summary>
    [Authorize(Roles = Roles.Superviseur)]
    [ApiController]
    [Route("api/explorateur")]
    public class ExplorateurController : ControllerBase
    {
        private readonly IExplorateurService _explorateur;
        private readonly StoreContext _context;

        public ExplorateurController(IExplorateurService explorateur, StoreContext context)
        {
            _explorateur = explorateur;
            _context = context;
        }

        [HttpGet("catalogue")]
        public ActionResult<object> GetCatalogue() => Ok(new
        {
            sections = ExplorateurCatalogue.Sections.Select(s => new { id = s.Id, libelle = s.Libelle, icone = s.Icone }),
            questions = ExplorateurCatalogue.Questions.Select(q => new
            {
                q.Id, q.Section, q.Question, q.Description, q.Rendu, q.Parametres,
                Obligatoires = q.Obligatoires ?? Array.Empty<string>()
            })
        });

        /// <summary>Values for the parameter pickers.</summary>
        [HttpGet("listes")]
        public async Task<ActionResult<object>> GetListes() => Ok(new
        {
            chaines = await _context.ChaineProductions.AsNoTracking().Where(c => c.IsActif).OrderBy(c => c.Libelle)
                .Select(c => new { id = c.IDChaineProduction, libelle = c.Libelle }).ToListAsync(),
            equipements = await _context.Equipments.AsNoTracking().Where(e => !e.IsDeleted).OrderBy(e => e.Designation)
                .Select(e => new { id = e.IdEquipement, libelle = e.CodeEquipement + " — " + e.Designation }).ToListAsync(),
            techniciens = await _context.Users.AsNoTracking().Where(u => u.IsActif && u.Role.Libelle == Roles.Technicien).OrderBy(u => u.Nom)
                .Select(u => new { id = u.ID, libelle = u.Prenom + " " + u.Nom }).ToListAsync(),
            articles = await _context.Pieces.AsNoTracking().Where(p => p.IsActif).OrderBy(p => p.Designation)
                .Select(p => new { id = p.IDPiece, libelle = p.CodePiece + " — " + p.Designation }).ToListAsync(),
            fournisseurs = await _context.Fournisseurs.AsNoTracking().Where(f => f.IsActif).OrderBy(f => f.Nom)
                .Select(f => new { id = f.Id, libelle = f.Nom }).ToListAsync()
        });

        [HttpPost("executer/{id}")]
        public async Task<ActionResult<object>> Run(string id, [FromBody] ExplorateurParametres parametres, CancellationToken ct)
        {
            var (resultat, erreur) = await _explorateur.RunAsync(id, parametres ?? new ExplorateurParametres(), ct);
            if (erreur != null) return BadRequest(new { message = erreur });
            return Ok(resultat);
        }
    }
}
