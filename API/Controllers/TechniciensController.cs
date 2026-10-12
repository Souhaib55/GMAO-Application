using API.Services;
using Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using static API.Controllers.DemandeInterventionController;

namespace API.Controllers
{
    /// <summary>Technician team: profile (rate, specialty), current workload and recent output.</summary>
    [Authorize(Roles = Roles.Superviseur)]
    [ApiController]
    [Route("api/techniciens")]
    public class TechniciensController : ControllerBase
    {
        private readonly StoreContext _context;
        private readonly ICurrentUserService _currentUser;
        private readonly IJournalService _journal;

        public TechniciensController(StoreContext context, ICurrentUserService currentUser, IJournalService journal)
        {
            _context = context;
            _currentUser = currentUser;
            _journal = journal;
        }

        [HttpGet]
        public async Task<ActionResult<object>> Get(int days = 30)
        {
            days = days is 7 or 30 or 90 or 365 ? days : 30;
            var depuis = DateTime.Today.AddDays(-days);
            var today = DateTime.Today;

            var rows = await _context.Users.AsNoTracking()
                .Where(u => u.IsActif && u.Role.Libelle == Roles.Technicien)
                .OrderBy(u => u.Nom).ThenBy(u => u.Prenom)
                .Select(u => new
                {
                    u.ID, u.Nom, u.Prenom, u.Email, u.Telephone, u.Specialite, u.TauxHoraire,
                    EnCours = _context.DemandeInterventions.Count(d => d.IsActif && d.DestinatairesID == u.ID && d.StatusId == StatusEnCours),
                    AFaire = _context.DemandeInterventions.Count(d => d.IsActif && d.DestinatairesID == u.ID && d.StatusId == StatusATraiter),
                    EnRetard = _context.DemandeInterventions.Count(d => d.IsActif && d.DestinatairesID == u.ID &&
                        d.StatusId <= StatusEnCours && d.DatePlanifiee != null && d.DatePlanifiee < today),
                    Realisees = _context.DemandeInterventions.Count(d => d.IsActif && d.DestinatairesID == u.ID &&
                        d.DateRealisation >= depuis && (d.StatusId == StatusRealisee || d.StatusId == StatusCloturee)),
                    MinutesSaisies = _context.InterventionTemps.Where(t => t.IdTechnicien == u.ID && t.DemandeIntervention.IsActif && t.Debut >= depuis).Sum(t => (int?)t.DureeMinutes) ?? 0,
                    // Hours already planned for open jobs (estimate)
                    MinutesPlanifiees = _context.DemandeInterventions.Where(d => d.IsActif && d.DestinatairesID == u.ID && d.StatusId <= StatusEnCours)
                        .Sum(d => (int?)d.DureeEstimeeMinutes) ?? 0
                })
                .ToListAsync();

            return Ok(rows.Select(r => new
            {
                r.ID, r.Nom, r.Prenom, r.Email, r.Telephone, r.Specialite, r.TauxHoraire,
                r.EnCours, r.AFaire, r.EnRetard, r.Realisees,
                HeuresSaisies = Math.Round(r.MinutesSaisies / 60.0, 1),
                HeuresPlanifiees = Math.Round(r.MinutesPlanifiees / 60.0, 1),
                Charge = r.EnCours + r.AFaire
            }));
        }

        public class ProfilDto
        {
            public decimal? TauxHoraire { get; set; }
            public string? Specialite { get; set; }
            public string? Telephone { get; set; }
        }

        [HttpPut("{id:int}")]
        public async Task<ActionResult> UpdateProfil(int id, [FromBody] ProfilDto dto)
        {
            var user = await _currentUser.GetAsync();
            var tech = await _context.Users.FirstOrDefaultAsync(u => u.ID == id);
            if (tech == null) return NotFound(new { message = "Technicien introuvable." });
            if (dto.TauxHoraire is < 0 or > 10000) return BadRequest(new { message = "Taux horaire invalide." });
            if (dto.Specialite?.Length > 100) return BadRequest(new { message = "Spécialité : 100 caractères maximum." });
            if (dto.Telephone?.Length > 30) return BadRequest(new { message = "Téléphone invalide." });

            tech.TauxHoraire = dto.TauxHoraire;
            tech.Specialite = string.IsNullOrWhiteSpace(dto.Specialite) ? null : dto.Specialite.Trim();
            tech.Telephone = string.IsNullOrWhiteSpace(dto.Telephone) ? null : dto.Telephone.Trim();
            tech.DateModification = DateTime.Now;
            _journal.Add(user, "Utilisateur", id, "Profil technicien", $"{tech.Prenom} {tech.Nom}");
            await _context.SaveChangesAsync();
            return Ok();
        }
    }
}
