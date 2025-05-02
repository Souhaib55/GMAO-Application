using API.DTOs;
using Core.Entities;
using Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.IO;

namespace API.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class DemandeInterventionController : ControllerBase
    {
        private readonly StoreContext _context;
        private readonly UserManager<AppUser> _userManager;

        public DemandeInterventionController(StoreContext context, UserManager<AppUser> userManager)
        {
            _context = context;
            _userManager = userManager;
        }

        [HttpGet]
        public async Task<ActionResult<pagedResult<object>>> GetDemandeInterventions(int page = 1, int pageSize = 5)
        {
            var query = _context.DemandeInterventions
                .Where(d => d.IsActif)
                .Include(d => d.Etat)
                .Include(d => d.TypeIntervention)
                .Include(d => d.Urgence)
                .Include(d => d.ChaineProduction)
                .Include(d => d.Demandeur)
                .Include(d => d.Destinataire);

            var totalCount = await query.CountAsync();
            var items = await query
                .OrderBy(d => d.IdDemandeIntervention)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(d => new
                {
                    d.IdDemandeIntervention,
                    d.Titre,
                    d.DateCreation,
                    d.FileName,
                    d.MachineArretee,
                    Etat = d.Etat != null ? new { d.Etat.IDEtat, d.Etat.Libelle } : null,
                    TypeIntervention = d.TypeIntervention != null ? new { d.TypeIntervention.IDTypeIntervention, d.TypeIntervention.Libelle } : null,
                    Urgence = d.Urgence != null ? new { d.Urgence.IDUrgence, d.Urgence.Libelle } : null,
                    ChaineProduction = d.ChaineProduction != null ? new { d.ChaineProduction.IDChaineProduction, d.ChaineProduction.Libelle } : null,
                    Demandeur = d.Demandeur != null ? new { d.Demandeur.ID, d.Demandeur.Nom, d.Demandeur.Prenom } : null,
                    Destinataire = d.Destinataire != null ? new { d.Destinataire.ID, d.Destinataire.Nom, d.Destinataire.Prenom } : null,
                    d.IsActif
                })
                .ToListAsync();

            return Ok(new pagedResult<object>
            {
                Data = items.Cast<object>().ToList(),
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize
            });
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<DemandeIntervention>> GetDemandeIntervention(int id)
        {
            var demande = await _context.DemandeInterventions
                .Include(d => d.Etat)
                .Include(d => d.TypeIntervention)
                .Include(d => d.Urgence)
                .Include(d => d.ChaineProduction)
                .Include(d => d.Demandeur)
                .Include(d => d.Destinataire)
                .FirstOrDefaultAsync(d => d.IdDemandeIntervention == id && d.IsActif);

            if (demande == null)
            {
                return NotFound("DemandeIntervention not found or inactive.");
            }

            return Ok(demande);
        }

        [HttpPost]
        public async Task<ActionResult<DemandeIntervention>> CreateDemandeIntervention([FromForm] InterventionDto demandeDto, [FromForm] IFormFile file)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var currentUser = await _userManager.GetUserAsync(User);
            if (currentUser == null) return Unauthorized("User not found");
            var roles = await _userManager.GetRolesAsync(currentUser);
            var role = roles.FirstOrDefault();

            var userEntity = await _context.Users.FirstOrDefaultAsync(u => u.AppUserId == currentUser.Id);
            if (userEntity == null) return BadRequest("User entity not found");

            // Validation checks
            if (!await _context.Etats.AnyAsync(e => e.IDEtat == demandeDto.IDEtat && e.IsActif))
                return BadRequest("Invalid or inactive Etat ID.");
            if (!await _context.TypeInterventions.AnyAsync(t => t.IDTypeIntervention == demandeDto.IDTypeIntervention && t.IsActif))
                return BadRequest("Invalid or inactive TypeIntervention ID.");
            if (!await _context.Urgences.AnyAsync(u => u.IDUrgence == demandeDto.IDUrgence && u.IsActif))
                return BadRequest("Invalid or inactive Urgence ID.");
            if (!await _context.ChaineProductions.AnyAsync(c => c.IDChaineProduction == demandeDto.IDChaineProduction && c.IsActif))
                return BadRequest("Invalid or inactive ChaineProduction ID.");
            if (!await _context.Users.AnyAsync(u => u.ID == demandeDto.DemandeursID && u.IsActif))
                return BadRequest("Invalid or inactive DemandeursID.");
            if (demandeDto.DestinatairesID != null && !await _context.Users.AnyAsync(u => u.ID == demandeDto.DestinatairesID && u.IsActif))
                return BadRequest("Invalid or inactive DestinatairesID.");

            if (role == "Demandeur" && demandeDto.DemandeursID != userEntity.ID)
            {
                return BadRequest("Demandeur can only create interventions for themselves.");
            }

            var demande = new DemandeIntervention
            {
                Titre = demandeDto.Titre,
                DateCreation = demandeDto.DateCreation,
                MachineArretee = demandeDto.MachineArretee,
                IDEtat = demandeDto.IDEtat,
                IDTypeIntervention = demandeDto.IDTypeIntervention,
                IDUrgence = demandeDto.IDUrgence,
                IDChaineProduction = demandeDto.IDChaineProduction,
                DemandeursID = demandeDto.DemandeursID,
                DestinatairesID = demandeDto.DestinatairesID,
                IsActif = true
            };

            if (file != null && file.Length > 0)
            {
                using (var memoryStream = new MemoryStream())
                {
                    await file.CopyToAsync(memoryStream);
                    demande.FileData = memoryStream.ToArray();
                    demande.FileName = file.FileName;
                    demande.ContentType = file.ContentType;
                }
            }

            _context.DemandeInterventions.Add(demande);
            await _context.SaveChangesAsync();

            var createdDemande = await _context.DemandeInterventions
                .Include(d => d.Etat)
                .Include(d => d.TypeIntervention)
                .Include(d => d.Urgence)
                .Include(d => d.ChaineProduction)
                .Include(d => d.Demandeur)
                .Include(d => d.Destinataire)
                .FirstOrDefaultAsync(d => d.IdDemandeIntervention == demande.IdDemandeIntervention);

            return CreatedAtAction(nameof(GetDemandeIntervention), new { id = demande.IdDemandeIntervention }, createdDemande);
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<DemandeIntervention>> UpdateDemandeIntervention(int id, [FromForm] InterventionDto demandeDto, [FromForm] IFormFile? file)
        {
            if (id != demandeDto.IdDemandeIntervention) return BadRequest("ID mismatch.");
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var existingDemande = await _context.DemandeInterventions
                .Include(d => d.Etat)
                .FirstOrDefaultAsync(d => d.IdDemandeIntervention == id && d.IsActif);
            if (existingDemande == null) return NotFound("DemandeIntervention not found or inactive.");

            var currentUser = await _userManager.GetUserAsync(User);
            if (currentUser == null) return Unauthorized("User not found");
            var roles = await _userManager.GetRolesAsync(currentUser);
            var role = roles.FirstOrDefault();

            if (role != "Superviseur")
            {
                return Forbid("Only Superviseur can edit interventions.");
            }

            if (demandeDto.IDEtat != existingDemande.IDEtat)
            {
                var newEtat = await _context.Etats.FindAsync(demandeDto.IDEtat);
                if (newEtat == null) return BadRequest("Invalid Etat ID.");
                if (!IsAllowedStatusTransition(existingDemande.Etat.Libelle, newEtat.Libelle, role, currentUser.Id, existingDemande))
                {
                    return Forbid("You are not allowed to perform this status change.");
                }
            }

            if (!await _context.Etats.AnyAsync(e => e.IDEtat == demandeDto.IDEtat && e.IsActif))
                return BadRequest("Invalid or inactive Etat ID.");
            if (!await _context.TypeInterventions.AnyAsync(t => t.IDTypeIntervention == demandeDto.IDTypeIntervention && t.IsActif))
                return BadRequest("Invalid or inactive TypeIntervention ID.");
            if (!await _context.Urgences.AnyAsync(u => u.IDUrgence == demandeDto.IDUrgence && u.IsActif))
                return BadRequest("Invalid or inactive Urgence ID.");
            if (!await _context.ChaineProductions.AnyAsync(c => c.IDChaineProduction == demandeDto.IDChaineProduction && c.IsActif))
                return BadRequest("Invalid or inactive ChaineProduction ID.");
            if (!await _context.Users.AnyAsync(u => u.ID == demandeDto.DemandeursID && u.IsActif))
                return BadRequest("Invalid or inactive DemandeursID.");
            if (demandeDto.DestinatairesID != null && !await _context.Users.AnyAsync(u => u.ID == demandeDto.DestinatairesID && u.IsActif))
                return BadRequest("Invalid or inactive DestinatairesID.");

            existingDemande.Titre = demandeDto.Titre;
            existingDemande.DateCreation = demandeDto.DateCreation;
            existingDemande.MachineArretee = demandeDto.MachineArretee;
            existingDemande.IDEtat = demandeDto.IDEtat;
            existingDemande.IDTypeIntervention = demandeDto.IDTypeIntervention;
            existingDemande.IDUrgence = demandeDto.IDUrgence;
            existingDemande.IDChaineProduction = demandeDto.IDChaineProduction;
            existingDemande.DemandeursID = demandeDto.DemandeursID;
            existingDemande.DestinatairesID = demandeDto.DestinatairesID;
            existingDemande.IsActif = demandeDto.IsActif;

            if (file != null && file.Length > 0)
            {
                using (var memoryStream = new MemoryStream())
                {
                    await file.CopyToAsync(memoryStream);
                    existingDemande.FileData = memoryStream.ToArray();
                    existingDemande.FileName = file.FileName;
                    existingDemande.ContentType = file.ContentType;
                }
            }

            await _context.SaveChangesAsync();

            var updatedDemande = await _context.DemandeInterventions
                .Include(d => d.Etat)
                .Include(d => d.TypeIntervention)
                .Include(d => d.Urgence)
                .Include(d => d.ChaineProduction)
                .Include(d => d.Demandeur)
                .Include(d => d.Destinataire)
                .FirstOrDefaultAsync(d => d.IdDemandeIntervention == id);

            return Ok(updatedDemande);
        }

        [HttpGet("{id}/file")]
        public async Task<IActionResult> GetFile(int id)
        {
            var demande = await _context.DemandeInterventions
                .FirstOrDefaultAsync(d => d.IdDemandeIntervention == id && d.IsActif);

            if (demande == null || demande.FileData == null)
            {
                return NotFound("File not found.");
            }
            return File(demande.FileData, demande.ContentType, demande.FileName);
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Superviseur")]
        public async Task<IActionResult> DeleteDemandeIntervention(int id)
        {
            var demande = await _context.DemandeInterventions
                .FirstOrDefaultAsync(d => d.IdDemandeIntervention == id && d.IsActif);

            if (demande == null)
            {
                return NotFound("DemandeIntervention not found or already inactive.");
            }

            demande.IsActif = false;
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool IsAllowedStatusTransition(string currentStatus, string newStatus, string userRole, string userId, DemandeIntervention demande)
        {
            switch (userRole)
            {
                case "Superviseur":
                    return true;
                case "Technicien":
                    if (demande.DestinatairesID != null && demande.DestinatairesID.ToString() == userId)
                    {
                        if (currentStatus == "A traiter" && (newStatus == "En cours" || newStatus == "Terminé"))
                            return true;
                        if (currentStatus == "En cours" && newStatus == "Terminé")
                            return true;
                    }
                    return false;
                case "Demandeur":
                    if (demande.DemandeursID.ToString() == userId)
                    {
                        if (currentStatus == "Terminé" && newStatus == "Validé")
                            return true;
                    }
                    return false;
                default:
                    return false;
            }
        }
    }

    public class pagedResult<T>
    {
        public List<T> Data { get; set; } = new List<T>();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
    }
}