using API.DTOs;
using Core.Entities;
using Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.IO;
using System.Text.Json;

namespace API.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class DemandeInterventionController : ControllerBase
    {
        private readonly StoreContext _context;
        private readonly UserManager<AppUser> _userManager;
        private readonly ILogger<DemandeInterventionController> _logger;

        public DemandeInterventionController(StoreContext context, UserManager<AppUser> userManager, ILogger<DemandeInterventionController> logger)
        {
            _context = context;
            _userManager = userManager;
            _logger = logger;
        }

        [HttpGet]
        public async Task<ActionResult<pagedResult<object>>> GetDemandeInterventions(int page = 1, int pageSize = 5)
        {
            var query = _context.DemandeInterventions
                .Where(d => d.IsActif)
                .Include(d => d.Etat)
                .Include(d => d.Status)
                .Include(d => d.TypeIntervention)
                .Include(d => d.Urgence)
                .Include(d => d.ChaineProduction)
                .Include(d => d.Panne)
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
                    Status = d.Status != null ? new { d.Status.Id, d.Status.Statut } : null,
                    TypeIntervention = d.TypeIntervention != null ? new { d.TypeIntervention.IDTypeIntervention, d.TypeIntervention.Libelle } : null,
                    Urgence = d.Urgence != null ? new { d.Urgence.IDUrgence, d.Urgence.Libelle } : null,
                    ChaineProduction = d.ChaineProduction != null ? new { d.ChaineProduction.IDChaineProduction, d.ChaineProduction.Libelle } : null,
                    Panne = d.Panne != null ? new { d.Panne.IDPanne, d.Panne.Libelle } : null,
                    Demandeur = d.Demandeur != null ? new { d.Demandeur.ID, d.Demandeur.Nom, d.Demandeur.Prenom } : null,
                    Destinataire = d.Destinataire != null ? new { d.Destinataire.ID, d.Destinataire.Nom, d.Destinataire.Prenom } : null,
                    d.DateAssignation,
                    d.DateRealisation,
                    d.DateCloture,
                    d.RaisonAnnulation,
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
                .Include(d => d.Status)
                .Include(d => d.TypeIntervention)
                .Include(d => d.Urgence)
                .Include(d => d.ChaineProduction)
                .Include(d => d.Panne)
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
        public async Task<ActionResult<DemandeIntervention>> CreateDemandeIntervention([FromForm] InterventionDto demandeDto, [FromForm] IFormFile? file)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var currentUser = await _userManager.GetUserAsync(User);
            if (currentUser == null) return Unauthorized("User not found");
            var roles = await _userManager.GetRolesAsync(currentUser);
            var role = roles.FirstOrDefault();
            var userEntity = await _context.Users.FirstOrDefaultAsync(u => u.AppUserId == currentUser.Id);
            if (userEntity == null) return BadRequest("User entity not found");

            if (!await _context.Etats.AnyAsync(e => e.IDEtat == demandeDto.IDEtat && e.IsActif))
                return BadRequest("Invalid or inactive Etat ID.");
            if (!await _context.TypeInterventions.AnyAsync(t => t.IDTypeIntervention == demandeDto.IDTypeIntervention && t.IsActif))
                return BadRequest("Invalid or inactive TypeIntervention ID.");
            if (!await _context.Urgences.AnyAsync(u => u.IDUrgence == demandeDto.IDUrgence && u.IsActif))
                return BadRequest("Invalid or inactive Urgence ID.");
            if (!await _context.ChaineProductions.AnyAsync(c => c.IDChaineProduction == demandeDto.IDChaineProduction && c.IsActif))
                return BadRequest("Invalid or inactive ChaineProduction ID.");
            if (!await _context.Pannes.AnyAsync(p => p.IDPanne == demandeDto.IDPanne && p.IsActif))
                return BadRequest("Invalid or inactive Panne ID.");
            if (!await _context.Users.AnyAsync(u => u.ID == demandeDto.DemandeursID && u.IsActif))
                return BadRequest("Invalid or inactive DemandeursID.");
            if (demandeDto.DestinatairesID != null && !await _context.Users.AnyAsync(u => u.ID == demandeDto.DestinatairesID && u.IsActif))
                return BadRequest("Invalid or inactive DestinatairesID.");

            if (role == "Demandeur" && demandeDto.DemandeursID != userEntity.ID)
            {
                return BadRequest("Demandeur can only create interventions for themselves.");
            }

            int statusId = 1; // "A traiter"
            if (role == "Superviseur" && demandeDto.DestinatairesID.HasValue)
            {
                statusId = 2; // "En cours"
            }

            var demande = new DemandeIntervention
            {
                Titre = demandeDto.Titre,
                DateCreation = demandeDto.DateCreation,
                MachineArretee = demandeDto.MachineArretee,
                IDEtat = demandeDto.IDEtat,
                StatusId = statusId,
                IDTypeIntervention = demandeDto.IDTypeIntervention,
                IDUrgence = demandeDto.IDUrgence,
                IDChaineProduction = demandeDto.IDChaineProduction,
                IDPanne = demandeDto.IDPanne,
                DemandeursID = demandeDto.DemandeursID,
                DestinatairesID = demandeDto.DestinatairesID,
                DateAssignation = null,
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
                .Include(d => d.Status)
                .Include(d => d.TypeIntervention)
                .Include(d => d.Urgence)
                .Include(d => d.ChaineProduction)
                .Include(d => d.Panne)
                .Include(d => d.Demandeur)
                .Include(d => d.Destinataire)
                .FirstOrDefaultAsync(d => d.IdDemandeIntervention == demande.IdDemandeIntervention);

            return CreatedAtAction(nameof(GetDemandeIntervention), new { id = demande.IdDemandeIntervention }, createdDemande);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateDemandeIntervention(int id)
        {
            InterventionDto demandeDto;
            IFormFile? file = null;
            IFormCollection? form = null;

            // Handle JSON content type
            if (Request.ContentType == "application/json")
            {
                demandeDto = await Request.ReadFromJsonAsync<InterventionDto>();
                if (demandeDto == null)
                {
                    _logger.LogWarning("Failed to deserialize JSON body");
                    return BadRequest("Invalid JSON data");
                }
            }
            // Handle multipart/form-data
            else if (Request.ContentType.StartsWith("multipart/form-data"))
            {
                form = await Request.ReadFormAsync();
                var demandeDtoJson = form["demandeDto"];
                file = form.Files["file"];

                if (string.IsNullOrEmpty(demandeDtoJson))
                {
                    _logger.LogWarning("FormData missing 'demandeDto' field");
                    return BadRequest("FormData must include 'demandeDto' field");
                }

                demandeDto = JsonSerializer.Deserialize<InterventionDto>(demandeDtoJson);
                if (demandeDto == null)
                {
                    _logger.LogWarning("Failed to deserialize demandeDto from FormData");
                    return BadRequest("Invalid demandeDto data in FormData");
                }
            }
            else
            {
                _logger.LogWarning($"Unsupported content type: {Request.ContentType}");
                return BadRequest("Unsupported content type");
            }

            // Validation logic
            _logger.LogInformation($"Starting update - ID: {id}, Action: {demandeDto.WorkflowAction}");

            if (!string.IsNullOrEmpty(demandeDto.WorkflowAction))
            {
                demandeDto.IdDemandeIntervention = id; // Force ID from route for workflow actions
            }
            else if (id > 0 && demandeDto.IdDemandeIntervention > 0 && id != demandeDto.IdDemandeIntervention)
            {
                _logger.LogWarning($"ID mismatch: {id} != {demandeDto.IdDemandeIntervention}");
                return BadRequest("ID mismatch.");
            }

            var existingDemande = await _context.DemandeInterventions
                .Include(d => d.Status)
                .Include(d => d.Etat)
                .FirstOrDefaultAsync(d => d.IdDemandeIntervention == id && d.IsActif);

            if (existingDemande == null)
            {
                _logger.LogWarning($"Intervention not found: {id}");
                return NotFound("DemandeIntervention not found or inactive.");
            }

            var currentUser = await _userManager.GetUserAsync(User);
            if (currentUser == null)
            {
                _logger.LogWarning("User not authenticated");
                return Unauthorized("User not found");
            }

            var roles = await _userManager.GetRolesAsync(currentUser);
            var role = roles.FirstOrDefault();
            var userEntity = await _context.Users.FirstOrDefaultAsync(u => u.AppUserId == currentUser.Id);

            if (userEntity == null)
            {
                _logger.LogWarning($"User entity not found for {currentUser.Id}");
                return BadRequest("User entity not found");
            }

            // Handle workflow actions
            if (!string.IsNullOrEmpty(demandeDto.WorkflowAction))
            {
                _logger.LogInformation($"Processing workflow action: {demandeDto.WorkflowAction} by {role} (User ID: {userEntity.ID})");
                var result = await HandleWorkflowAction(existingDemande, demandeDto.WorkflowAction, role, userEntity.ID, demandeDto.RaisonAnnulation);
                if (result != null)
                {
                    return result;
                }
            }
            // Handle standard updates (Superviseur only)
            else if (role == "Superviseur")
            {
                if (demandeDto.DestinatairesID.HasValue && existingDemande.DestinatairesID != demandeDto.DestinatairesID)
                {
                    if (!await _context.Users.AnyAsync(u => u.ID == demandeDto.DestinatairesID && u.IsActif))
                        return BadRequest("Invalid or inactive DestinatairesID.");
                    existingDemande.DestinatairesID = demandeDto.DestinatairesID;
                    if (existingDemande.StatusId == 1)
                        existingDemande.StatusId = 2; // "En cours"
                }

                if (demandeDto.Titre != null) existingDemande.Titre = demandeDto.Titre;
                if (demandeDto.DateCreation != DateTime.MinValue) existingDemande.DateCreation = demandeDto.DateCreation;
                if (demandeDto.MachineArretee != existingDemande.MachineArretee) existingDemande.MachineArretee = demandeDto.MachineArretee;
                if (demandeDto.IDEtat > 0 && existingDemande.IDEtat != demandeDto.IDEtat)
                {
                    if (!await _context.Etats.AnyAsync(e => e.IDEtat == demandeDto.IDEtat && e.IsActif)) return BadRequest("Invalid or inactive Etat ID.");
                    existingDemande.IDEtat = demandeDto.IDEtat;
                }
                if (demandeDto.IDTypeIntervention > 0 && existingDemande.IDTypeIntervention != demandeDto.IDTypeIntervention)
                {
                    if (!await _context.TypeInterventions.AnyAsync(t => t.IDTypeIntervention == demandeDto.IDTypeIntervention && t.IsActif)) return BadRequest("Invalid or inactive TypeIntervention ID.");
                    existingDemande.IDTypeIntervention = demandeDto.IDTypeIntervention;
                }
                if (demandeDto.IDUrgence > 0 && existingDemande.IDUrgence != demandeDto.IDUrgence)
                {
                    if (!await _context.Urgences.AnyAsync(u => u.IDUrgence == demandeDto.IDUrgence && u.IsActif)) return BadRequest("Invalid or inactive Urgence ID.");
                    existingDemande.IDUrgence = demandeDto.IDUrgence;
                }
                if (demandeDto.IDChaineProduction > 0 && existingDemande.IDChaineProduction != demandeDto.IDChaineProduction)
                {
                    if (!await _context.ChaineProductions.AnyAsync(c => c.IDChaineProduction == demandeDto.IDChaineProduction && c.IsActif)) return BadRequest("Invalid or inactive ChaineProduction ID.");
                    existingDemande.IDChaineProduction = demandeDto.IDChaineProduction;
                }
                if (demandeDto.IDPanne > 0 && existingDemande.IDPanne != demandeDto.IDPanne)
                {
                    if (!await _context.Pannes.AnyAsync(p => p.IDPanne == demandeDto.IDPanne && p.IsActif)) return BadRequest("Invalid or inactive Panne ID.");
                    existingDemande.IDPanne = demandeDto.IDPanne;
                }
                if (demandeDto.DemandeursID > 0 && existingDemande.DemandeursID != demandeDto.DemandeursID)
                {
                    if (!await _context.Users.AnyAsync(u => u.ID == demandeDto.DemandeursID && u.IsActif)) return BadRequest("Invalid or inactive DemandeursID.");
                    existingDemande.DemandeursID = demandeDto.DemandeursID;
                }

                // Handle file upload or clear
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
                else if (form != null && form["fileName"] == "")
                {
                    existingDemande.FileData = null;
                    existingDemande.FileName = null;
                    existingDemande.ContentType = null;
                }
            }
            else
            {
                _logger.LogWarning($"Standard update not allowed for role: {role}");
                return Forbid("Only Superviseur can perform standard updates");
            }

            await _context.SaveChangesAsync();
            _logger.LogInformation($"Update successful for ID: {id}");

            var updatedDemande = await _context.DemandeInterventions
                .Include(d => d.Etat)
                .Include(d => d.Status)
                .Include(d => d.TypeIntervention)
                .Include(d => d.Urgence)
                .Include(d => d.ChaineProduction)
                .Include(d => d.Panne)
                .Include(d => d.Demandeur)
                .Include(d => d.Destinataire)
                .FirstOrDefaultAsync(d => d.IdDemandeIntervention == id);

            return Ok(updatedDemande);
        }

        private async Task<ActionResult> HandleWorkflowAction(DemandeIntervention demande, string action, string userRole, int? userId, string? raisonAnnulation)
        {
            if (userId == null)
            {
                _logger.LogWarning("Workflow action attempted without user ID");
                return Unauthorized("User ID not found");
            }

            _logger.LogInformation($"Processing action: {action}, Role: {userRole}, Current StatusId: {demande.StatusId}, User ID: {userId}, DateAssignation: {demande.DateAssignation}");

            switch (action.ToLower())
            {
                case "accept":
                    if (userRole != "Technicien" && userRole != "Utilisateur")
                    {
                        _logger.LogWarning($"Accept action denied - Invalid role: {userRole}");
                        return BadRequest("Only Technicien or Utilisateur can accept an intervention");
                    }
                    if (demande.DestinatairesID != userId)
                    {
                        _logger.LogWarning($"Accept action denied - User {userId} is not the assigned recipient: {demande.DestinatairesID}");
                        return BadRequest("You are not the assigned recipient of this intervention");
                    }
                    if (demande.StatusId != 2)
                    {
                        _logger.LogWarning($"Accept action denied - Invalid status: {demande.StatusId}");
                        return BadRequest("This intervention is not awaiting acceptance");
                    }
                    if (demande.DateAssignation != null)
                    {
                        _logger.LogWarning($"Accept action denied - Already accepted: {demande.DateAssignation}");
                        return BadRequest("This intervention has already been accepted");
                    }
                    demande.DateAssignation = DateTime.Now;
                    _logger.LogInformation($"Intervention accepted by {userRole}: {userId}, timestamp: {demande.DateAssignation}");
                    return null;

                case "complete":
                    if (userRole != "Technicien" && userRole != "Utilisateur")
                    {
                        _logger.LogWarning($"Complete action denied - Invalid role: {userRole}");
                        return BadRequest("Only Technicien or Utilisateur can complete an intervention");
                    }
                    if (demande.DestinatairesID != userId)
                    {
                        _logger.LogWarning($"Complete action denied - User {userId} is not the assigned recipient: {demande.DestinatairesID}");
                        return BadRequest("You are not the assigned recipient of this intervention");
                    }
                    if (demande.StatusId != 2)
                    {
                        _logger.LogWarning($"Complete action denied - Invalid status: {demande.StatusId}, expected 2");
                        return BadRequest("This intervention is not in 'En cours' state");
                    }
                    if (demande.DateAssignation == null)
                    {
                        _logger.LogWarning($"Complete action denied - Not accepted yet");
                        return BadRequest("This intervention has not been accepted yet");
                    }
                    demande.StatusId = 3; // "Réalisée"
                    demande.DateRealisation = DateTime.Now;
                    _logger.LogInformation($"Intervention completed by {userRole}: {userId}, timestamp: {demande.DateRealisation}");
                    return null;

                case "validate":
                    if (userRole != "Superviseur")
                    {
                        _logger.LogWarning($"Validate action denied - Invalid role: {userRole}");
                        return BadRequest("Only a Superviseur can validate an intervention");
                    }
                    if (demande.StatusId != 3)
                    {
                        _logger.LogWarning($"Validate action denied - Invalid status: {demande.StatusId}, expected 3");
                        return BadRequest("Only a completed intervention can be validated");
                    }
                    demande.StatusId = 4; // "Clôturée"
                    demande.DateCloture = DateTime.Now;
                    _logger.LogInformation($"Intervention validated by Superviseur: {userId}, timestamp: {demande.DateCloture}");
                    return null;

                case "cancel":
                    bool canCancel = false;
                    if (userRole == "Superviseur")
                    {
                        canCancel = (demande.StatusId != 4 && demande.StatusId != 5);
                        _logger.LogInformation($"Superviseur cancel check: {canCancel}");
                    }
                    else if (userRole == "Demandeur" && demande.DemandeursID == userId)
                    {
                        canCancel = (demande.StatusId == 1 || (demande.StatusId == 2 && demande.DateAssignation == null));
                        _logger.LogInformation($"Demandeur cancel check: {canCancel} (StatusId: {demande.StatusId}, DateAssignation: {demande.DateAssignation})");
                    }
                    else if ((userRole == "Utilisateur" || userRole == "Technicien") && demande.DestinatairesID == userId)
                    {
                        canCancel = (demande.StatusId == 2 && demande.DateAssignation == null);
                        _logger.LogInformation($"Utilisateur/Technicien cancel check: {canCancel} (StatusId: {demande.StatusId}, DateAssignation: {demande.DateAssignation})");
                    }
                    if (!canCancel)
                    {
                        _logger.LogWarning($"Cancel action denied - Role: {userRole}, StatusId: {demande.StatusId}, DateAssignation: {demande.DateAssignation}");
                        return BadRequest("You are not authorized to cancel this intervention at its current state");
                    }
                    demande.StatusId = 5; // "Annulée"
                    demande.RaisonAnnulation = raisonAnnulation;
                    _logger.LogInformation($"Intervention cancelled by {userRole}: {userId}, reason: {raisonAnnulation}");
                    return null;

                default:
                    _logger.LogWarning($"Unknown workflow action: {action}");
                    return BadRequest($"Unknown workflow action: {action}");
            }
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
    }

    public class pagedResult<T>
    {
        public List<T> Data { get; set; } = new List<T>();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
    }
}