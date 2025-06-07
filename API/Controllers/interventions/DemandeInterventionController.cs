using API.DTOs;
using Core.Entities;
using Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Globalization;
using System.IO;
using System.Text.Json;
using System.Threading.Tasks;

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
        public async Task<ActionResult<PagedResult<object>>> GetDemandeInterventions(int page = 1, int pageSize = 5, string search = null)
        {
            // Obtenir l'utilisateur actuel et son rôle
            var currentUser = await _userManager.GetUserAsync(User);
            if (currentUser == null) return Unauthorized("User not found");

            var roles = await _userManager.GetRolesAsync(currentUser);
            var role = roles.FirstOrDefault();
            if (role == null) return BadRequest("User has no role");

            var userEntity = await _context.Users.FirstOrDefaultAsync(u => u.AppUserId == currentUser.Id);
            if (userEntity == null) return BadRequest("User entity not found");

            var query = _context.DemandeInterventions.Where(d => d.IsActif);

            // Filtrer selon le rôle de l'utilisateur
            if (role == "Demandeur")
            {
                // Le demandeur ne voit que les interventions qu'il a créées
                query = query.Where(d => d.DemandeursID == userEntity.ID);
                _logger.LogInformation($"Filtering interventions for Demandeur ID: {userEntity.ID}");
            }
            else if (role == "Utilisateur" || role == "Technicien")
            {
                // L'utilisateur/technicien voit les interventions qu'il a créées ou qui lui sont assignées
                query = query.Where(d => d.DemandeursID == userEntity.ID || d.DestinatairesID == userEntity.ID);
                _logger.LogInformation($"Filtering interventions for Utilisateur/Technicien ID: {userEntity.ID}");
            }
            // Le Superviseur voit tout, donc pas de filtre supplémentaire nécessaire

            if (!string.IsNullOrWhiteSpace(search))
            {
                search = search.ToLower().Trim();
                query = query.Where(d => d.Titre.ToLower().Contains(search));
                _logger.LogInformation($"Search filter applied: '{search}'");
            }

            query = query
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
                    d.IsActif,
                    d.DatePriseEnCharge,
                    d.DateResolution
                })
                .ToListAsync();

            _logger.LogInformation($"Retrieved {items.Count} interventions for role {role} (page {page}, size {pageSize})");
            return Ok(new PagedResult<object> { Data = items.Cast<object>().ToList(), TotalCount = totalCount, Page = page, PageSize = pageSize });
        }

        // Le reste du contrôleur reste inchangé...
        [HttpGet("today-count")]
        public async Task<ActionResult<int>> GetTodayInterventionCount()
        {
            var currentUser = await _userManager.GetUserAsync(User);
            if (currentUser == null) return Unauthorized("User not found");

            var roles = await _userManager.GetRolesAsync(currentUser);
            var role = roles.FirstOrDefault();
            if (role == null) return BadRequest("User has no role");

            var userEntity = await _context.Users.FirstOrDefaultAsync(u => u.AppUserId == currentUser.Id);
            if (userEntity == null) return BadRequest("User entity not found");

            var today = DateTime.Now.Date;
            var tomorrow = today.AddDays(1);
            IQueryable<DemandeIntervention> query = _context.DemandeInterventions
                .Where(d => d.IsActif && d.DateCreation >= today && d.DateCreation < tomorrow);

            if (role == "Demandeur")
            {
                query = query.Where(d => d.DemandeursID == userEntity.ID);
            }
            else if (role == "Utilisateur" || role == "Technicien")
            {
                query = query.Where(d => d.DemandeursID == userEntity.ID || d.DestinatairesID == userEntity.ID);
            }

            var count = await query.CountAsync();
            _logger.LogInformation($"Today's count for {role} (ID: {userEntity.ID}): {count}");
            return Ok(count);
        }

        // Le reste des méthodes du contrôleur reste inchangé...
        [HttpGet("{id}")]
        public async Task<ActionResult<DemandeIntervention>> GetDemandeIntervention(int id)
        {
            // Obtenir l'utilisateur actuel et son rôle
            var currentUser = await _userManager.GetUserAsync(User);
            if (currentUser == null) return Unauthorized("User not found");

            var roles = await _userManager.GetRolesAsync(currentUser);
            var role = roles.FirstOrDefault();
            var userEntity = await _context.Users.FirstOrDefaultAsync(u => u.AppUserId == currentUser.Id);
            if (userEntity == null) return BadRequest("User entity not found");

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
                _logger.LogWarning($"Intervention ID {id} not found or inactive");
                return NotFound("Intervention not found or inactive");
            }

            // Vérifier les autorisations basées sur le rôle
            if (role == "Demandeur" && demande.DemandeursID != userEntity.ID)
            {
                _logger.LogWarning($"Unauthorized access: Demandeur {userEntity.ID} tried to access intervention {id}");
                return Forbid("Not authorized to view this intervention");
            }
            else if ((role == "Utilisateur" || role == "Technicien") && 
                    (demande.DemandeursID != userEntity.ID && demande.DestinatairesID != userEntity.ID))
            {
                _logger.LogWarning($"Unauthorized access: {role} {userEntity.ID} tried to access intervention {id}");
                return Forbid("Not authorized to view this intervention");
            }

            return Ok(demande);
        }

        // Le reste des méthodes...
        [HttpPost]
        public async Task<ActionResult<DemandeIntervention>> CreateDemandeIntervention()
        {
            InterventionDto demandeDto;
            IFormFile? file = null;

            // Handle form data similar to the PUT method
            if (Request.ContentType.StartsWith("multipart/form-data"))
            {
                var form = await Request.ReadFormAsync();
                var demandeDtoJson = form["demandeDto"];
                file = form.Files.GetFile("file");
                
                if (string.IsNullOrEmpty(demandeDtoJson))
                {
                    _logger.LogWarning("Missing 'demandeDto' field in form data");
                    return BadRequest("Missing 'demandeDto' field");
                }
                
                try
                {
                    demandeDto = JsonSerializer.Deserialize<InterventionDto>(demandeDtoJson);
                    if (demandeDto == null)
                    {
                        _logger.LogWarning("Could not deserialize demandeDto");
                        return BadRequest("Invalid demandeDto data");
                    }
                    _logger.LogInformation($"Deserialized DTO: {JsonSerializer.Serialize(demandeDto)}");
                }
                catch (JsonException ex)
                {
                    _logger.LogError($"Deserialization error: {ex.Message}");
                    return BadRequest($"Failed to parse demandeDto JSON: {ex.Message}");
                }
            }
            else
            {
                _logger.LogWarning($"Unsupported content type: {Request.ContentType}");
                return BadRequest("Expected multipart/form-data content type");
            }

            if (!ModelState.IsValid)
            {
                _logger.LogWarning("Invalid ModelState");
                return BadRequest(ModelState);
            }

            if (string.IsNullOrEmpty(demandeDto.DateCreation))
            {
                _logger.LogWarning("DateCreation is empty");
                return BadRequest("DateCreation is required");
            }

            DateTime dateCreation;
            try
            {
                dateCreation = DateTime.Parse(demandeDto.DateCreation, CultureInfo.InvariantCulture, DateTimeStyles.AssumeLocal);
                _logger.LogInformation($"Parsed DateCreation: {dateCreation}");
            }
            catch (FormatException ex)
            {
                _logger.LogWarning($"Invalid DateCreation format: {demandeDto.DateCreation}, Error: {ex.Message}");
                return BadRequest("Invalid DateCreation format. Use YYYY-MM-DDTHH:MM:SS");
            }

            var currentUser = await _userManager.GetUserAsync(User);
            if (currentUser == null) return Unauthorized("User not found");

            var roles = await _userManager.GetRolesAsync(currentUser);
            var role = roles.FirstOrDefault();
            var userEntity = await _context.Users.FirstOrDefaultAsync(u => u.AppUserId == currentUser.Id);
            if (userEntity == null) return BadRequest("User entity not found");

            // Validation with detailed logging
            if (!await _context.Etats.AnyAsync(e => e.IDEtat == demandeDto.IDEtat && e.IsActif))
            {
                _logger.LogWarning($"Invalid Etat ID: {demandeDto.IDEtat}");
                return BadRequest("Invalid or inactive Etat ID");
            }
            if (!await _context.TypeInterventions.AnyAsync(t => t.IDTypeIntervention == demandeDto.IDTypeIntervention && t.IsActif))
            {
                _logger.LogWarning($"Invalid TypeIntervention ID: {demandeDto.IDTypeIntervention}");
                return BadRequest("Invalid or inactive TypeIntervention ID");
            }
            if (!await _context.Urgences.AnyAsync(u => u.IDUrgence == demandeDto.IDUrgence && u.IsActif))
            {
                _logger.LogWarning($"Invalid Urgence ID: {demandeDto.IDUrgence}");
                return BadRequest("Invalid or inactive Urgence ID");
            }
            if (!await _context.ChaineProductions.AnyAsync(c => c.IDChaineProduction == demandeDto.IDChaineProduction && c.IsActif))
            {
                _logger.LogWarning($"Invalid ChaineProduction ID: {demandeDto.IDChaineProduction}");
                return BadRequest("Invalid or inactive ChaineProduction ID");
            }
            if (!await _context.Pannes.AnyAsync(p => p.IDPanne == demandeDto.IDPanne && p.IsActif))
            {
                _logger.LogWarning($"Invalid Panne ID: {demandeDto.IDPanne}");
                return BadRequest("Invalid or inactive Panne ID");
            }
            if (!await _context.Users.AnyAsync(u => u.ID == demandeDto.DemandeursID && u.IsActif))
            {
                _logger.LogWarning($"Invalid DemandeursID: {demandeDto.DemandeursID}");
                return BadRequest("Invalid or inactive DemandeursID");
            }
            if (demandeDto.DestinatairesID.HasValue && !await _context.Users.AnyAsync(u => u.ID == demandeDto.DestinatairesID && u.IsActif))
            {
                _logger.LogWarning($"Invalid DestinatairesID: {demandeDto.DestinatairesID}");
                return BadRequest("Invalid or inactive DestinatairesID");
            }

            if (role == "Demandeur" && demandeDto.DemandeursID != userEntity.ID)
            {
                _logger.LogWarning($"Demandeur {userEntity.ID} tried to create for {demandeDto.DemandeursID}");
                return BadRequest("Demandeur can only create for themselves");
            }

            int statusId = 1; // "A traiter"
            if (role == "Superviseur" && demandeDto.DestinatairesID.HasValue) statusId = 2; // "En cours"

            var demande = new DemandeIntervention
            {
                Titre = demandeDto.Titre,
                DateCreation = dateCreation,
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

            if (statusId == 2) demande.DatePriseEnCharge = DateTime.Now;

            if (file != null && file.Length > 0)
            {
                _logger.LogInformation($"File uploaded: {file.FileName}, Size: {file.Length}");
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
            _logger.LogInformation($"Created intervention ID: {demande.IdDemandeIntervention}");

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

            if (Request.ContentType == "application/json")
            {
                demandeDto = await Request.ReadFromJsonAsync<InterventionDto>();
                if (demandeDto == null) return BadRequest("Invalid JSON data");
            }
            else if (Request.ContentType.StartsWith("multipart/form-data"))
            {
                form = await Request.ReadFormAsync();
                var demandeDtoJson = form["demandeDto"];
                file = form.Files.GetFile("file");
                if (string.IsNullOrEmpty(demandeDtoJson)) return BadRequest("Missing 'demandeDto' field");
                try
                {
                    demandeDto = JsonSerializer.Deserialize<InterventionDto>(demandeDtoJson);
                    if (demandeDto == null) return BadRequest("Invalid demandeDto data");
                }
                catch (JsonException ex)
                {
                    _logger.LogError($"Deserialization error: {ex.Message}");
                    return BadRequest("Failed to parse demandeDto JSON");
                }
            }
            else
            {
                return BadRequest("Unsupported content type");
            }

            if (!string.IsNullOrEmpty(demandeDto.WorkflowAction)) demandeDto.IdDemandeIntervention = id;
            else if (id != demandeDto.IdDemandeIntervention) return BadRequest("ID mismatch");

            var existingDemande = await _context.DemandeInterventions
                .Include(d => d.Status)
                .Include(d => d.Etat)
                .FirstOrDefaultAsync(d => d.IdDemandeIntervention == id && d.IsActif);

            if (existingDemande == null) return NotFound("Intervention not found or inactive");

            var currentUser = await _userManager.GetUserAsync(User);
            if (currentUser == null) return Unauthorized("User not found");

            var roles = await _userManager.GetRolesAsync(currentUser);
            var role = roles.FirstOrDefault();
            var userEntity = await _context.Users.FirstOrDefaultAsync(u => u.AppUserId == currentUser.Id);
            if (userEntity == null) return BadRequest("User entity not found");

            // Vérification des permissions basées sur le rôle
            if (role == "Demandeur" && existingDemande.DemandeursID != userEntity.ID)
            {
                return Forbid("Not authorized to update this intervention");
            }
            else if ((role == "Utilisateur" || role == "Technicien") && 
                   (existingDemande.DemandeursID != userEntity.ID && existingDemande.DestinatairesID != userEntity.ID))
            {
                return Forbid("Not authorized to update this intervention");
            }

            if (!string.IsNullOrEmpty(demandeDto.WorkflowAction))
            {
                var result = await HandleWorkflowAction(existingDemande, demandeDto.WorkflowAction, role, userEntity.ID, demandeDto.RaisonAnnulation);
                if (result != null) return result;
            }
            else if (role == "Superviseur")
            {
                if (demandeDto.DestinatairesID.HasValue && existingDemande.DestinatairesID != demandeDto.DestinatairesID)
                {
                    if (!await _context.Users.AnyAsync(u => u.ID == demandeDto.DestinatairesID && u.IsActif)) return BadRequest("Invalid or inactive DestinatairesID");
                    existingDemande.DestinatairesID = demandeDto.DestinatairesID;
                    if (existingDemande.StatusId == 1)
                    {
                        existingDemande.StatusId = 2;
                        existingDemande.DatePriseEnCharge = DateTime.Now;
                    }
                }

                if (demandeDto.Titre != null) existingDemande.Titre = demandeDto.Titre;
                if (!string.IsNullOrEmpty(demandeDto.DateCreation))
                {
                    try
                    {
                        existingDemande.DateCreation = DateTime.Parse(demandeDto.DateCreation, CultureInfo.InvariantCulture, DateTimeStyles.AssumeLocal);
                    }
                    catch (FormatException)
                    {
                        return BadRequest("Invalid DateCreation format. Use YYYY-MM-DDTHH:MM:SS");
                    }
                }
                if (demandeDto.MachineArretee != existingDemande.MachineArretee) existingDemande.MachineArretee = demandeDto.MachineArretee;
                if (demandeDto.IDEtat > 0 && existingDemande.IDEtat != demandeDto.IDEtat)
                {
                    if (!await _context.Etats.AnyAsync(e => e.IDEtat == demandeDto.IDEtat && e.IsActif)) return BadRequest("Invalid or inactive Etat ID");
                    existingDemande.IDEtat = demandeDto.IDEtat;
                }
                if (demandeDto.IDTypeIntervention > 0 && existingDemande.IDTypeIntervention != demandeDto.IDTypeIntervention)
                {
                    if (!await _context.TypeInterventions.AnyAsync(t => t.IDTypeIntervention == demandeDto.IDTypeIntervention && t.IsActif)) return BadRequest("Invalid or inactive TypeIntervention ID");
                    existingDemande.IDTypeIntervention = demandeDto.IDTypeIntervention;
                }
                if (demandeDto.IDUrgence > 0 && existingDemande.IDUrgence != demandeDto.IDUrgence)
                {
                    if (!await _context.Urgences.AnyAsync(u => u.IDUrgence == demandeDto.IDUrgence && u.IsActif)) return BadRequest("Invalid or inactive Urgence ID");
                    existingDemande.IDUrgence = demandeDto.IDUrgence;
                }
                if (demandeDto.IDChaineProduction > 0 && existingDemande.IDChaineProduction != demandeDto.IDChaineProduction)
                {
                    if (!await _context.ChaineProductions.AnyAsync(c => c.IDChaineProduction == demandeDto.IDChaineProduction && c.IsActif)) return BadRequest("Invalid or inactive ChaineProduction ID");
                    existingDemande.IDChaineProduction = demandeDto.IDChaineProduction;
                }
                if (demandeDto.IDPanne > 0 && existingDemande.IDPanne != demandeDto.IDPanne)
                {
                    if (!await _context.Pannes.AnyAsync(p => p.IDPanne == demandeDto.IDPanne && p.IsActif)) return BadRequest("Invalid or inactive Panne ID");
                    existingDemande.IDPanne = demandeDto.IDPanne;
                }
                if (demandeDto.DemandeursID > 0 && existingDemande.DemandeursID != demandeDto.DemandeursID)
                {
                    if (!await _context.Users.AnyAsync(u => u.ID == demandeDto.DemandeursID && u.IsActif)) return BadRequest("Invalid or inactive DemandeursID");
                    existingDemande.DemandeursID = demandeDto.DemandeursID;
                }

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
                return Forbid("Only Superviseur can update");
            }

            await _context.SaveChangesAsync();
            _logger.LogInformation($"Updated intervention ID: {id}");

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
            if (userId == null) return Unauthorized("User ID not found");

            switch (action.ToLower())
            {
                case "accept":
                    if (userRole != "Technicien" && userRole != "Utilisateur") return BadRequest("Only Technicien or Utilisateur can accept");
                    if (demande.DestinatairesID != userId) return BadRequest("Not the assigned recipient");
                    if (demande.StatusId != 2) return BadRequest("Not awaiting acceptance");
                    if (demande.DateAssignation != null) return BadRequest("Already accepted");
                    demande.DateAssignation = DateTime.Now;
                    return null;

                case "complete":
                    if (userRole != "Technicien" && userRole != "Utilisateur") return BadRequest("Only Technicien or Utilisateur can complete");
                    if (demande.DestinatairesID != userId) return BadRequest("Not the assigned recipient");
                    if (demande.StatusId != 2) return BadRequest("Not in 'En cours' state");
                    if (demande.DateAssignation == null) return BadRequest("Not accepted yet");
                    demande.StatusId = 3;
                    demande.DateRealisation = DateTime.Now;
                    demande.DateResolution = DateTime.Now;
                    return null;

                case "validate":
                    if (userRole != "Superviseur") return BadRequest("Only Superviseur can validate");
                    if (demande.StatusId != 3) return BadRequest("Only completed interventions can be validated");
                    demande.StatusId = 4;
                    demande.DateCloture = DateTime.Now;
                    return null;

                case "cancel":
                    bool canCancel = userRole == "Superviseur" ? (demande.StatusId != 4 && demande.StatusId != 5) :
                        (userRole == "Demandeur" && demande.DemandeursID == userId) ? (demande.StatusId == 1 || (demande.StatusId == 2 && demande.DateAssignation == null)) :
                        ((userRole == "Utilisateur" || userRole == "Technicien") && demande.DestinatairesID == userId) ? (demande.StatusId == 2 && demande.DateAssignation == null) : false;
                    if (!canCancel) return BadRequest("Not authorized to cancel at this state");
                    demande.StatusId = 5;
                    demande.RaisonAnnulation = raisonAnnulation;
                    return null;

                default:
                    return BadRequest($"Unknown action: {action}");
            }
        }

        [HttpGet("{id}/file")]
        public async Task<IActionResult> GetFile(int id)
        {
            var currentUser = await _userManager.GetUserAsync(User);
            if (currentUser == null) return Unauthorized("User not found");

            var roles = await _userManager.GetRolesAsync(currentUser);
            var role = roles.FirstOrDefault();
            var userEntity = await _context.Users.FirstOrDefaultAsync(u => u.AppUserId == currentUser.Id);
            if (userEntity == null) return BadRequest("User entity not found");

            var demande = await _context.DemandeInterventions.FirstOrDefaultAsync(d => d.IdDemandeIntervention == id && d.IsActif);
            if (demande == null || demande.FileData == null) return NotFound("File not found");
            
            // Vérifier les autorisations basées sur le rôle
            if (role == "Demandeur" && demande.DemandeursID != userEntity.ID)
            {
                return Forbid("Not authorized to download this file");
            }
            else if ((role == "Utilisateur" || role == "Technicien") && 
                   (demande.DemandeursID != userEntity.ID && demande.DestinatairesID != userEntity.ID))
            {
                return Forbid("Not authorized to download this file");
            }
            
            return File(demande.FileData, demande.ContentType, demande.FileName);
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Superviseur")]
        public async Task<IActionResult> DeleteDemandeIntervention(int id)
        {
            var demande = await _context.DemandeInterventions.FirstOrDefaultAsync(d => d.IdDemandeIntervention == id && d.IsActif);
            if (demande == null) return NotFound("Intervention not found or inactive");
            demande.IsActif = false;
            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpGet("dashboard-stats")]
        public async Task<ActionResult<object>> GetDashboardStats()
        {
            try
            {
                // Obtenir l'utilisateur actuel et son rôle
                var currentUser = await _userManager.GetUserAsync(User);
                if (currentUser == null) return Unauthorized("User not found");

                var roles = await _userManager.GetRolesAsync(currentUser);
                var role = roles.FirstOrDefault();
                var userEntity = await _context.Users.FirstOrDefaultAsync(u => u.AppUserId == currentUser.Id);
                if (userEntity == null) return BadRequest("User entity not found");

                // Base query for active interventions
                IQueryable<DemandeIntervention> baseQuery = _context.DemandeInterventions.Where(d => d.IsActif);
                
                // Filter by role
                if (role == "Demandeur")
                {
                    baseQuery = baseQuery.Where(d => d.DemandeursID == userEntity.ID);
                }
                else if (role == "Utilisateur" || role == "Technicien")
                {
                    baseQuery = baseQuery.Where(d => d.DemandeursID == userEntity.ID || d.DestinatairesID == userEntity.ID);
                }
                
                var interventionStats = new
                {
                    enAttente = await baseQuery.CountAsync(d => d.StatusId == 1),
                    enCours = await baseQuery.CountAsync(d => d.StatusId == 2),
                    terminee = await baseQuery.CountAsync(d => d.StatusId == 3 || d.StatusId == 4),
                    annulee = await baseQuery.CountAsync(d => d.StatusId == 5)
                };

                // For machine stats, if not Superviseur, filter based on user's interventions
                IQueryable<DemandeIntervention> machineQuery = _context.DemandeInterventions.Where(d => d.IsActif && d.MachineArretee && (d.StatusId == 1 || d.StatusId == 2));
                
                if (role == "Demandeur")
                {
                    machineQuery = machineQuery.Where(d => d.DemandeursID == userEntity.ID);
                }
                else if (role == "Utilisateur" || role == "Technicien")
                {
                    machineQuery = machineQuery.Where(d => d.DemandeursID == userEntity.ID || d.DestinatairesID == userEntity.ID);
                }
                
                var machineCount = await _context.ChaineProductions.CountAsync(c => c.IsActif);
                var machinesArretees = await machineQuery.CountAsync();
                
                var machineStats = new
                {
                    arretees = machinesArretees,
                    enFonctionnement = machineCount - machinesArretees,
                    total = machineCount,
                    pourcentageArretees = machineCount > 0 ? Math.Round((double)machinesArretees / machineCount * 100, 1) : 0
                };

                // Recent interventions
                var recentQuery = _context.DemandeInterventions.Where(d => d.IsActif);
                
                if (role == "Demandeur")
                {
                    recentQuery = recentQuery.Where(d => d.DemandeursID == userEntity.ID);
                }
                else if (role == "Utilisateur" || role == "Technicien")
                {
                    recentQuery = recentQuery.Where(d => d.DemandeursID == userEntity.ID || d.DestinatairesID == userEntity.ID);
                }
                
                var recentInterventions = await recentQuery
                    .Include(d => d.Status)
                    .OrderByDescending(d => d.DateCreation)
                    .Take(5)
                    .Select(d => new { idDemandeIntervention = d.IdDemandeIntervention, titre = d.Titre, dateCreation = d.DateCreation, status = new { id = d.Status.Id, statut = d.Status.Statut } })
                    .ToListAsync();

                // Monthly data
                var sixMonthsAgo = DateTime.Now.AddMonths(-6);
                var monthlyQuery = _context.DemandeInterventions.Where(d => d.IsActif && d.DateCreation >= sixMonthsAgo);
                
                if (role == "Demandeur")
                {
                    monthlyQuery = monthlyQuery.Where(d => d.DemandeursID == userEntity.ID);
                }
                else if (role == "Utilisateur" || role == "Technicien")
                {
                    monthlyQuery = monthlyQuery.Where(d => d.DemandeursID == userEntity.ID || d.DestinatairesID == userEntity.ID);
                }
                
                var monthlyData = await monthlyQuery
                    .GroupBy(d => new { Year = d.DateCreation.Year, Month = d.DateCreation.Month })
                    .Select(g => new { year = g.Key.Year, month = g.Key.Month, count = g.Count() })
                    .OrderBy(d => d.year).ThenBy(d => d.month)
                    .ToListAsync();

                // Urgence data
                var urgenceQuery = _context.DemandeInterventions.Where(d => d.IsActif);
                
                if (role == "Demandeur")
                {
                    urgenceQuery = urgenceQuery.Where(d => d.DemandeursID == userEntity.ID);
                }
                else if (role == "Utilisateur" || role == "Technicien")
                {
                    urgenceQuery = urgenceQuery.Where(d => d.DemandeursID == userEntity.ID || d.DestinatairesID == userEntity.ID);
                }
                
                var urgenceData = await urgenceQuery
                    .GroupBy(d => d.IDUrgence)
                    .Select(g => new { urgenceId = g.Key, count = g.Count() })
                    .Join(_context.Urgences, ud => ud.urgenceId, u => u.IDUrgence, (ud, u) => new { id = ud.urgenceId, libelle = u.Libelle, count = ud.count })
                    .ToListAsync();

                return Ok(new { interventionStats, machineStats, recentInterventions, monthlyData, urgenceData });
            }
            catch (Exception ex)
            {
                _logger.LogError($"Dashboard stats error: {ex.Message}");
                return StatusCode(500, "Error retrieving dashboard stats");
            }
        }
    }

    public class PagedResulT<T>
    {
        public List<T> Data { get; set; } = new List<T>();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
    }

    public class InterventionDto
    {
        public int IdDemandeIntervention { get; set; }
        public string Titre { get; set; }
        public bool MachineArretee { get; set; }
        public int IDEtat { get; set; }
        public int IDTypeIntervention { get; set; }
        public int IDUrgence { get; set; }
        public int IDChaineProduction { get; set; }
        public int IDPanne { get; set; }
        public int DemandeursID { get; set; }
        public int? DestinatairesID { get; set; }
        public string DateCreation { get; set; }
        public string WorkflowAction { get; set; }
        public string RaisonAnnulation { get; set; }
    }
}