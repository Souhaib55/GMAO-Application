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
        
        // File upload constraints
        private const long MaxFileSize = 10 * 1024 * 1024; // 10 MB
        private static readonly string[] AllowedExtensions = { 
            ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".txt", ".csv",
            ".jpg", ".jpeg", ".png", ".gif", ".bmp", 
            ".zip", ".rar", ".7z"
        };
        private static readonly string[] AllowedMimeTypes = { 
            "application/pdf", 
            "application/msword", 
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "text/plain",
            "text/csv",
            "image/jpeg",
            "image/png",
            "image/gif",
            "image/bmp",
            "application/zip",
            "application/x-zip-compressed",
            "application/x-rar-compressed",
            "application/x-7z-compressed",
            "application/octet-stream" // Allow generic binary for some file types
        };

        public DemandeInterventionController(StoreContext context, UserManager<AppUser> userManager, ILogger<DemandeInterventionController> logger)
        {
            _context = context;
            _userManager = userManager;
            _logger = logger;
        }
        
        private (bool isValid, string? errorMessage) ValidateFile(IFormFile file)
        {
            if (file.Length > MaxFileSize)
            {
                return (false, $"La taille du fichier dépasse la limite de {MaxFileSize / (1024 * 1024)} MB");
            }

            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!AllowedExtensions.Contains(extension))
            {
                return (false, $"Type de fichier non autorisé. Types acceptés: {string.Join(", ", AllowedExtensions)}");
            }

            // Check MIME type but be lenient - some browsers report different MIME types
            // Only reject if the MIME type is clearly dangerous
            var dangerousMimeTypes = new[] { "application/x-msdownload", "application/x-executable" };
            if (dangerousMimeTypes.Contains(file.ContentType.ToLowerInvariant()))
            {
                return (false, $"Type MIME non autorisé: {file.ContentType}");
            }

            return (true, null);
        }

        [HttpGet]
        public async Task<ActionResult<PagedResult<object>>> GetDemandeInterventions(int page = 1, int pageSize = 5, string? search = null)
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

            // Handle both JSON and form data
            if (Request.ContentType != null && Request.ContentType.StartsWith("multipart/form-data"))
            {
                var form = await Request.ReadFormAsync();
                var demandeDtoJson = form["interventionData"];
                file = form.Files.GetFile("file");
                
                if (string.IsNullOrEmpty(demandeDtoJson))
                {
                    _logger.LogWarning("Missing 'interventionData' field in form data");
                    return BadRequest("Missing 'interventionData' field");
                }
                
                try
                {
                    var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                    demandeDto = JsonSerializer.Deserialize<InterventionDto>(demandeDtoJson.ToString(), options)!;
                    if (demandeDto == null)
                    {
                        _logger.LogWarning("Could not deserialize demandeDto");
                        return BadRequest("Invalid interventionData data");
                    }
                    _logger.LogInformation($"Deserialized DTO: {JsonSerializer.Serialize(demandeDto)}");
                }
                catch (JsonException ex)
                {
                    _logger.LogError($"Deserialization error: {ex.Message}");
                    return BadRequest($"Failed to parse interventionData JSON: {ex.Message}");
                }
            }
            else
            {
                // Handle JSON request
                try
                {
                    var tempDto = await Request.ReadFromJsonAsync<InterventionDto>();
                    if (tempDto == null)
                    {
                        _logger.LogWarning("Could not deserialize JSON body");
                        return BadRequest("Invalid JSON data");
                    }
                    demandeDto = tempDto;
                }
                catch (Exception ex)
                {
                    _logger.LogError($"JSON deserialization error: {ex.Message}");
                    return BadRequest($"Failed to parse JSON: {ex.Message}");
                }
            }

            if (!ModelState.IsValid)
            {
                _logger.LogWarning("Invalid ModelState");
                return BadRequest(ModelState);
            }

            DateTime dateCreation = demandeDto.DateCreation;
            _logger.LogInformation($"Using DateCreation: {dateCreation}");

            var currentUser = await _userManager.GetUserAsync(User);
            if (currentUser == null) return Unauthorized("User not found");

            var roles = await _userManager.GetRolesAsync(currentUser);
            var role = roles.FirstOrDefault();
            var userEntity = await _context.Users.FirstOrDefaultAsync(u => u.AppUserId == currentUser.Id);
            if (userEntity == null) return BadRequest("User entity not found");

            // Validation with detailed logging - only validate if value is provided
            if (demandeDto.IDEtat.HasValue && !await _context.Etats.AnyAsync(e => e.IDEtat == demandeDto.IDEtat && e.IsActif))
            {
                _logger.LogWarning($"Invalid Etat ID: {demandeDto.IDEtat}");
                return BadRequest("Invalid or inactive Etat ID");
            }
            if (demandeDto.IDTypeIntervention.HasValue && !await _context.TypeInterventions.AnyAsync(t => t.IDTypeIntervention == demandeDto.IDTypeIntervention && t.IsActif))
            {
                _logger.LogWarning($"Invalid TypeIntervention ID: {demandeDto.IDTypeIntervention}");
                return BadRequest("Invalid or inactive TypeIntervention ID");
            }
            if (demandeDto.IDUrgence.HasValue && !await _context.Urgences.AnyAsync(u => u.IDUrgence == demandeDto.IDUrgence && u.IsActif))
            {
                _logger.LogWarning($"Invalid Urgence ID: {demandeDto.IDUrgence}");
                return BadRequest("Invalid or inactive Urgence ID");
            }
            if (demandeDto.IDChaineProduction.HasValue && !await _context.ChaineProductions.AnyAsync(c => c.IDChaineProduction == demandeDto.IDChaineProduction && c.IsActif))
            {
                _logger.LogWarning($"Invalid ChaineProduction ID: {demandeDto.IDChaineProduction}");
                return BadRequest("Invalid or inactive ChaineProduction ID");
            }
            if (demandeDto.IDPanne.HasValue && !await _context.Pannes.AnyAsync(p => p.IDPanne == demandeDto.IDPanne && p.IsActif))
            {
                _logger.LogWarning($"Invalid Panne ID: {demandeDto.IDPanne}");
                return BadRequest("Invalid or inactive Panne ID");
            }
            
            // Use current user's ID if DemandeursID is not provided
            int demandeursId = demandeDto.DemandeursID ?? userEntity.ID;
            if (!await _context.Users.AnyAsync(u => u.ID == demandeursId && u.IsActif))
            {
                _logger.LogWarning($"Invalid DemandeursID: {demandeursId}");
                return BadRequest("Invalid or inactive DemandeursID");
            }
            
            if (demandeDto.DestinatairesID.HasValue && !await _context.Users.AnyAsync(u => u.ID == demandeDto.DestinatairesID && u.IsActif))
            {
                _logger.LogWarning($"Invalid DestinatairesID: {demandeDto.DestinatairesID}");
                return BadRequest("Invalid or inactive DestinatairesID");
            }

            if (role == "Demandeur" && demandeursId != userEntity.ID)
            {
                _logger.LogWarning($"Demandeur {userEntity.ID} tried to create for {demandeursId}");
                return BadRequest("Demandeur can only create for themselves");
            }

            int statusId = 1; // "A traiter"
            if (role == "Superviseur" && demandeDto.DestinatairesID.HasValue) statusId = 2; // "En cours"

            var demande = new DemandeIntervention
            {
                Titre = demandeDto.Titre ?? "Sans titre",
                DateCreation = dateCreation,
                MachineArretee = demandeDto.MachineArretee,
                IDEtat = demandeDto.IDEtat ?? await _context.Etats.Where(e => e.IsActif).Select(e => e.IDEtat).FirstOrDefaultAsync(),
                StatusId = statusId,
                IDTypeIntervention = demandeDto.IDTypeIntervention ?? await _context.TypeInterventions.Where(t => t.IsActif).Select(t => t.IDTypeIntervention).FirstOrDefaultAsync(),
                IDUrgence = demandeDto.IDUrgence ?? await _context.Urgences.Where(u => u.IsActif).Select(u => u.IDUrgence).FirstOrDefaultAsync(),
                IDChaineProduction = demandeDto.IDChaineProduction ?? await _context.ChaineProductions.Where(c => c.IsActif).Select(c => c.IDChaineProduction).FirstOrDefaultAsync(),
                IDPanne = demandeDto.IDPanne ?? await _context.Pannes.Where(p => p.IsActif).Select(p => p.IDPanne).FirstOrDefaultAsync(),
                DemandeursID = demandeursId,
                DestinatairesID = demandeDto.DestinatairesID,
                DateAssignation = null,
                IsActif = true
            };

            if (statusId == 2) demande.DatePriseEnCharge = DateTime.Now;

            if (file != null && file.Length > 0)
            {
                // Validate file
                var (isValid, errorMessage) = ValidateFile(file);
                if (!isValid)
                {
                    _logger.LogWarning($"File validation failed: {errorMessage}");
                    return BadRequest(errorMessage);
                }
                
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

            // Notify all superviseurs when a new intervention is created by Demandeur or Utilisateur
            if (role == "Demandeur" || role == "Utilisateur")
            {
                var superviseurs = await _context.Users
                    .Include(u => u.Role)
                    .Where(u => u.Role.Libelle == "Superviseur" && u.IsActif)
                    .ToListAsync();

                foreach (var sup in superviseurs)
                {
                    await NotificationController.CreateNotificationAsync(
                        _context,
                        "Nouvelle intervention créée",
                        $"Une nouvelle intervention \"{demande.Titre}\" a été créée.",
                        "intervention_created",
                        sup.ID,
                        userEntity.ID,
                        demande.IdDemandeIntervention
                    );
                }
                _logger.LogInformation($"Notified {superviseurs.Count} superviseurs about new intervention");
            }

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
                var tempDto = await Request.ReadFromJsonAsync<InterventionDto>();
                if (tempDto == null) return BadRequest("Invalid JSON data");
                demandeDto = tempDto;
            }
            else if (Request.ContentType != null && Request.ContentType.StartsWith("multipart/form-data"))
            {
                form = await Request.ReadFormAsync();
                var demandeDtoJson = form["interventionData"];
                file = form.Files.GetFile("file");
                if (string.IsNullOrEmpty(demandeDtoJson)) return BadRequest("Missing 'interventionData' field");
                try
                {
                    var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                    var tempDto = JsonSerializer.Deserialize<InterventionDto>(demandeDtoJson.ToString(), options);
                    if (tempDto == null) return BadRequest("Invalid interventionData data");
                    demandeDto = tempDto;
                }
                catch (JsonException ex)
                {
                    _logger.LogError($"Deserialization error: {ex.Message}");
                    return BadRequest("Failed to parse interventionData JSON");
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
                var result = await HandleWorkflowAction(existingDemande, demandeDto.WorkflowAction, role ?? "Unknown", userEntity.ID, demandeDto.RaisonAnnulation);
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
                if (demandeDto.DateCreation != default(DateTime))
                {
                    existingDemande.DateCreation = demandeDto.DateCreation;
                }
                if (demandeDto.MachineArretee != existingDemande.MachineArretee) existingDemande.MachineArretee = demandeDto.MachineArretee;
                if (demandeDto.IDEtat.HasValue && demandeDto.IDEtat.Value > 0 && existingDemande.IDEtat != demandeDto.IDEtat.Value)
                {
                    if (!await _context.Etats.AnyAsync(e => e.IDEtat == demandeDto.IDEtat.Value && e.IsActif)) return BadRequest("Invalid or inactive Etat ID");
                    existingDemande.IDEtat = demandeDto.IDEtat.Value;
                }
                if (demandeDto.IDTypeIntervention.HasValue && demandeDto.IDTypeIntervention.Value > 0 && existingDemande.IDTypeIntervention != demandeDto.IDTypeIntervention.Value)
                {
                    if (!await _context.TypeInterventions.AnyAsync(t => t.IDTypeIntervention == demandeDto.IDTypeIntervention.Value && t.IsActif)) return BadRequest("Invalid or inactive TypeIntervention ID");
                    existingDemande.IDTypeIntervention = demandeDto.IDTypeIntervention.Value;
                }
                if (demandeDto.IDUrgence.HasValue && demandeDto.IDUrgence.Value > 0 && existingDemande.IDUrgence != demandeDto.IDUrgence.Value)
                {
                    if (!await _context.Urgences.AnyAsync(u => u.IDUrgence == demandeDto.IDUrgence.Value && u.IsActif)) return BadRequest("Invalid or inactive Urgence ID");
                    existingDemande.IDUrgence = demandeDto.IDUrgence.Value;
                }
                if (demandeDto.IDChaineProduction.HasValue && demandeDto.IDChaineProduction.Value > 0 && existingDemande.IDChaineProduction != demandeDto.IDChaineProduction.Value)
                {
                    if (!await _context.ChaineProductions.AnyAsync(c => c.IDChaineProduction == demandeDto.IDChaineProduction.Value && c.IsActif)) return BadRequest("Invalid or inactive ChaineProduction ID");
                    existingDemande.IDChaineProduction = demandeDto.IDChaineProduction.Value;
                }
                if (demandeDto.IDPanne.HasValue && demandeDto.IDPanne.Value > 0 && existingDemande.IDPanne != demandeDto.IDPanne.Value)
                {
                    if (!await _context.Pannes.AnyAsync(p => p.IDPanne == demandeDto.IDPanne.Value && p.IsActif)) return BadRequest("Invalid or inactive Panne ID");
                    existingDemande.IDPanne = demandeDto.IDPanne.Value;
                }
                if (demandeDto.DemandeursID.HasValue && demandeDto.DemandeursID.Value > 0 && existingDemande.DemandeursID != demandeDto.DemandeursID.Value)
                {
                    if (!await _context.Users.AnyAsync(u => u.ID == demandeDto.DemandeursID.Value && u.IsActif)) return BadRequest("Invalid or inactive DemandeursID");
                    existingDemande.DemandeursID = demandeDto.DemandeursID.Value;
                }

                if (file != null && file.Length > 0)
                {
                    // Validate file
                    var (isValid, errorMessage) = ValidateFile(file);
                    if (!isValid)
                    {
                        _logger.LogWarning($"File validation failed: {errorMessage}");
                        return BadRequest(errorMessage);
                    }
                    
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

        private async Task<ActionResult?> HandleWorkflowAction(DemandeIntervention demande, string action, string userRole, int? userId, string? raisonAnnulation)
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
                    break;

                case "complete":
                    if (userRole != "Technicien" && userRole != "Utilisateur") return BadRequest("Only Technicien or Utilisateur can complete");
                    if (demande.DestinatairesID != userId) return BadRequest("Not the assigned recipient");
                    if (demande.StatusId != 2) return BadRequest("Not in 'En cours' state");
                    if (demande.DateAssignation == null) return BadRequest("Not accepted yet");
                    demande.StatusId = 3;
                    demande.DateRealisation = DateTime.Now;
                    demande.DateResolution = DateTime.Now;
                    break;

                case "validate":
                    if (userRole != "Superviseur") return BadRequest("Only Superviseur can validate");
                    if (demande.StatusId != 3) return BadRequest("Only completed interventions can be validated");
                    demande.StatusId = 4;
                    demande.DateCloture = DateTime.Now;
                    break;

                case "cancel":
                    bool canCancel = userRole == "Superviseur" ? (demande.StatusId != 4 && demande.StatusId != 5) :
                        (userRole == "Demandeur" && demande.DemandeursID == userId) ? (demande.StatusId == 1 || (demande.StatusId == 2 && demande.DateAssignation == null)) :
                        ((userRole == "Utilisateur" || userRole == "Technicien") && demande.DestinatairesID == userId) ? (demande.StatusId == 2 && demande.DateAssignation == null) : false;
                    if (!canCancel) return BadRequest("Not authorized to cancel at this state");
                    demande.StatusId = 5;
                    demande.RaisonAnnulation = raisonAnnulation;
                    break;

                default:
                    return BadRequest($"Unknown action: {action}");
            }
            
            return null;
        }

        [HttpGet("{id}/file")]
        public async Task<IActionResult> GetFile(int id)
        {
            var currentUser = await _userManager.GetUserAsync(User);
            if (currentUser == null) return Unauthorized("User not found");

            var roles = await _userManager.GetRolesAsync(currentUser);
            var role = roles.FirstOrDefault();
            var userEntity = await _context.Users.FirstOrDefaultAsync(u => u.AppUserId == currentUser.Id);
            var demande = await _context.DemandeInterventions.FirstOrDefaultAsync(d => d.IdDemandeIntervention == id && d.IsActif);
            if (demande == null || demande.FileData == null || demande.ContentType == null) return NotFound("File not found");
            
            // Vérifier les autorisations basées sur le rôle
            if (role != null && role == "Demandeur" && demande.DemandeursID != userEntity?.ID)
            {
                return Forbid("Not authorized to download this file");
            }
            else if (role != null && (role == "Utilisateur" || role == "Technicien") && userEntity != null &&
                   (demande.DemandeursID != userEntity.ID && demande.DestinatairesID != userEntity.ID))
            {
                return Forbid("Not authorized to download this file");
            }
            
            return File(demande.FileData, demande.ContentType, demande.FileName ?? "file");
            
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

        [HttpPost("{id}/assign")]
        public async Task<ActionResult> AssignTechnician(int id, [FromBody] AssignTechnicianDto dto)
        {
            try
            {
                var intervention = await _context.DemandeInterventions
                    .Include(d => d.Demandeur)
                    .FirstOrDefaultAsync(d => d.IdDemandeIntervention == id);
                if (intervention == null) return NotFound("Intervention not found");

                // Get current user for notification
                var currentAppUser = await _userManager.GetUserAsync(User);
                var currentUser = await _context.Users.FirstOrDefaultAsync(u => u.AppUserId == currentAppUser.Id);

                // Try to find the technician user entity by ID (integer) or AppUserId (string)
                Users technicianUser = null;
                
                // First try to parse as integer (internal ID)
                if (int.TryParse(dto.TechnicianId, out int technicianIntId))
                {
                    technicianUser = await _context.Users.FirstOrDefaultAsync(u => u.ID == technicianIntId);
                }
                
                // If not found, try by AppUserId
                if (technicianUser == null)
                {
                    technicianUser = await _context.Users.FirstOrDefaultAsync(u => u.AppUserId == dto.TechnicianId);
                }
                
                if (technicianUser == null) return BadRequest("Technician not found");

                intervention.DestinatairesID = technicianUser.ID;
                intervention.DateAssignation = DateTime.Now;
                
                // Update status to "En cours" when assigned (as per workflow)
                if (intervention.StatusId == 1)
                {
                    intervention.StatusId = 2; // En cours - assigned to technician
                }

                await _context.SaveChangesAsync();

                // Create notification for the assigned technician
                await NotificationController.CreateNotificationAsync(
                    _context,
                    "Nouvelle intervention assignée",
                    $"L'intervention \"{intervention.Titre}\" vous a été assignée.",
                    "intervention_assigned",
                    technicianUser.ID,
                    currentUser?.ID,
                    intervention.IdDemandeIntervention
                );

                _logger.LogInformation($"Intervention {id} assigned to technician {dto.TechnicianId}");
                
                return Ok();
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error assigning technician: {ex.Message}");
                return StatusCode(500, "Error assigning technician");
            }
        }

        [HttpPatch("{id}/status")]
        public async Task<ActionResult> UpdateStatus(int id, [FromBody] UpdateStatusDto dto)
        {
            try
            {
                var intervention = await _context.DemandeInterventions
                    .Include(d => d.Demandeur)
                    .Include(d => d.Destinataire)
                    .FirstOrDefaultAsync(d => d.IdDemandeIntervention == id);
                if (intervention == null) return NotFound("Intervention not found");

                // Get current user for notification
                var currentAppUser = await _userManager.GetUserAsync(User);
                var currentUser = await _context.Users.FirstOrDefaultAsync(u => u.AppUserId == currentAppUser.Id);

                var oldStatusId = intervention.StatusId;
                intervention.StatusId = dto.StatusId;

                // Set appropriate timestamps
                switch (dto.StatusId)
                {
                    case 2: // En cours
                        intervention.DatePriseEnCharge = DateTime.Now;
                        break;
                    case 3: // Réalisée
                        intervention.DateRealisation = DateTime.Now;
                        break;
                    case 4: // Cloturée
                        intervention.DateCloture = DateTime.Now;
                        break;
                }

                await _context.SaveChangesAsync();

                // Send notifications based on status change
                await SendStatusChangeNotifications(intervention, dto.StatusId, currentUser);

                _logger.LogInformation($"Intervention {id} status updated to {dto.StatusId}");
                return Ok();
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error updating status: {ex.Message}");
                return StatusCode(500, "Error updating status");
            }
        }

        [HttpPost("{id}/cancel")]
        public async Task<ActionResult> CancelIntervention(int id, [FromBody] CancelInterventionDto dto)
        {
            try
            {
                var intervention = await _context.DemandeInterventions
                    .Include(d => d.Demandeur)
                    .Include(d => d.Destinataire)
                    .FirstOrDefaultAsync(d => d.IdDemandeIntervention == id);
                if (intervention == null) return NotFound("Intervention not found");

                // Get current user
                var currentAppUser = await _userManager.GetUserAsync(User);
                var currentUser = await _context.Users.FirstOrDefaultAsync(u => u.AppUserId == currentAppUser.Id);

                intervention.StatusId = 5; // Annulée
                intervention.RaisonAnnulation = dto.Reason;

                await _context.SaveChangesAsync();

                // Notify relevant parties
                await SendCancellationNotifications(intervention, currentUser);

                _logger.LogInformation($"Intervention {id} cancelled with reason: {dto.Reason}");
                return Ok();
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error cancelling intervention: {ex.Message}");
                return StatusCode(500, "Error cancelling intervention");
            }
        }

        [HttpPost("{id}/accept")]
        public async Task<ActionResult> AcceptIntervention(int id)
        {
            try
            {
                var intervention = await _context.DemandeInterventions
                    .Include(d => d.Demandeur)
                    .Include(d => d.Destinataire)
                    .FirstOrDefaultAsync(d => d.IdDemandeIntervention == id);
                if (intervention == null) return NotFound("Intervention not found");

                // Get current user
                var currentAppUser = await _userManager.GetUserAsync(User);
                var currentUser = await _context.Users
                    .Include(u => u.Role)
                    .FirstOrDefaultAsync(u => u.AppUserId == currentAppUser.Id);
                if (currentUser == null) return BadRequest("User not found");

                // Check if user is the assigned technician
                if (intervention.DestinatairesID != currentUser.ID)
                {
                    return BadRequest("Not the assigned technician");
                }

                // Check if already accepted
                if (intervention.DatePriseEnCharge != null)
                {
                    return BadRequest("Already accepted");
                }

                // Accept the intervention
                intervention.DatePriseEnCharge = DateTime.Now;

                await _context.SaveChangesAsync();

                // Notify superviseurs that technician accepted
                var superviseurs = await _context.Users
                    .Where(u => u.Role.Libelle == "Superviseur" && u.IsActif)
                    .ToListAsync();

                foreach (var sup in superviseurs)
                {
                    await NotificationController.CreateNotificationAsync(
                        _context,
                        "Intervention acceptée",
                        $"L'intervention \"{intervention.Titre}\" a été acceptée par {currentUser.Nom} {currentUser.Prenom}.",
                        "intervention_accepted",
                        sup.ID,
                        currentUser.ID,
                        intervention.IdDemandeIntervention
                    );
                }

                _logger.LogInformation($"Intervention {id} accepted by user {currentUser.ID}");
                return Ok();
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error accepting intervention: {ex.Message}");
                return StatusCode(500, "Error accepting intervention");
            }
        }

        [HttpPost("{id}/reject")]
        public async Task<ActionResult> RejectIntervention(int id, [FromBody] RejectInterventionDto dto)
        {
            try
            {
                var intervention = await _context.DemandeInterventions
                    .Include(d => d.Demandeur)
                    .Include(d => d.Destinataire)
                    .FirstOrDefaultAsync(d => d.IdDemandeIntervention == id);
                if (intervention == null) return NotFound("Intervention not found");

                // Get current user
                var currentAppUser = await _userManager.GetUserAsync(User);
                var currentUser = await _context.Users
                    .Include(u => u.Role)
                    .FirstOrDefaultAsync(u => u.AppUserId == currentAppUser.Id);
                if (currentUser == null) return BadRequest("User not found");

                // Check if user is the assigned technician
                if (intervention.DestinatairesID != currentUser.ID)
                {
                    return BadRequest("Not the assigned technician");
                }

                // Check if already accepted
                if (intervention.DatePriseEnCharge != null)
                {
                    return BadRequest("Cannot reject an already accepted intervention");
                }

                // Reject the intervention - unassign and add rejection reason
                var previousAssigneeId = intervention.DestinatairesID;
                intervention.DestinatairesID = null;
                intervention.DateAssignation = null;
                intervention.RaisonAnnulation = $"Refusée par {currentUser.Nom} {currentUser.Prenom}: {dto.Reason}";
                intervention.StatusId = 1; // Reset to A traiter

                await _context.SaveChangesAsync();

                // Notify superviseurs that technician rejected
                var superviseurs = await _context.Users
                    .Where(u => u.Role.Libelle == "Superviseur" && u.IsActif)
                    .ToListAsync();

                foreach (var sup in superviseurs)
                {
                    await NotificationController.CreateNotificationAsync(
                        _context,
                        "Intervention refusée",
                        $"L'intervention \"{intervention.Titre}\" a été refusée par {currentUser.Nom} {currentUser.Prenom}. Raison: {dto.Reason}",
                        "intervention_rejected",
                        sup.ID,
                        currentUser.ID,
                        intervention.IdDemandeIntervention
                    );
                }

                _logger.LogInformation($"Intervention {id} rejected by user {currentUser.ID}: {dto.Reason}");
                return Ok();
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error rejecting intervention: {ex.Message}");
                return StatusCode(500, "Error rejecting intervention");
            }
        }

        private async Task SendStatusChangeNotifications(DemandeIntervention intervention, int newStatusId, Users? triggeredBy)
        {
            var triggerUserId = triggeredBy?.ID;

            switch (newStatusId)
            {
                case 2: // En cours - Notify superviseurs that technician started
                    var superviseurs = await _context.Users
                        .Where(u => u.Role.Libelle == "Superviseur" && u.IsActif)
                        .ToListAsync();

                    foreach (var sup in superviseurs)
                    {
                        if (sup.ID != triggerUserId)
                        {
                            await NotificationController.CreateNotificationAsync(
                                _context,
                                "Intervention démarrée",
                                $"L'intervention \"{intervention.Titre}\" a été prise en charge.",
                                "intervention_started",
                                sup.ID,
                                triggerUserId,
                                intervention.IdDemandeIntervention
                            );
                        }
                    }
                    break;

                case 3: // Réalisée - Notify superviseurs that technician completed
                    var superviseurs2 = await _context.Users
                        .Where(u => u.Role.Libelle == "Superviseur" && u.IsActif)
                        .ToListAsync();

                    foreach (var sup in superviseurs2)
                    {
                        if (sup.ID != triggerUserId)
                        {
                            await NotificationController.CreateNotificationAsync(
                                _context,
                                "Intervention réalisée",
                                $"L'intervention \"{intervention.Titre}\" a été marquée comme réalisée et attend validation.",
                                "intervention_completed",
                                sup.ID,
                                triggerUserId,
                                intervention.IdDemandeIntervention
                            );
                        }
                    }
                    break;

                case 4: // Cloturée - Notify technician that supervisor closed
                    if (intervention.DestinatairesID.HasValue && intervention.DestinatairesID != triggerUserId)
                    {
                        await NotificationController.CreateNotificationAsync(
                            _context,
                            "Intervention clôturée",
                            $"L'intervention \"{intervention.Titre}\" a été clôturée par le superviseur.",
                            "intervention_closed",
                            intervention.DestinatairesID.Value,
                            triggerUserId,
                            intervention.IdDemandeIntervention
                        );
                    }
                    break;
            }
        }

        private async Task SendCancellationNotifications(DemandeIntervention intervention, Users? triggeredBy)
        {
            var triggerUserId = triggeredBy?.ID;

            // Notify the assigned technician if exists
            if (intervention.DestinatairesID.HasValue && intervention.DestinatairesID != triggerUserId)
            {
                await NotificationController.CreateNotificationAsync(
                    _context,
                    "Intervention annulée",
                    $"L'intervention \"{intervention.Titre}\" a été annulée.",
                    "intervention_cancelled",
                    intervention.DestinatairesID.Value,
                    triggerUserId,
                    intervention.IdDemandeIntervention
                );
            }

            // Notify superviseurs if cancelled by technician
            if (triggeredBy?.Role?.Libelle == "Utilisateur")
            {
                var superviseurs = await _context.Users
                    .Where(u => u.Role.Libelle == "Superviseur" && u.IsActif)
                    .ToListAsync();

                foreach (var sup in superviseurs)
                {
                    await NotificationController.CreateNotificationAsync(
                        _context,
                        "Intervention annulée",
                        $"L'intervention \"{intervention.Titre}\" a été annulée par le technicien.",
                        "intervention_cancelled",
                        sup.ID,
                        triggerUserId,
                        intervention.IdDemandeIntervention
                    );
                }
            }
        }
    }

    public class AssignTechnicianDto
    {
        public string TechnicianId { get; set; } = string.Empty;
    }

    public class UpdateStatusDto
    {
        public int StatusId { get; set; }
    }

    public class CancelInterventionDto
    {
        public string Reason { get; set; } = string.Empty;
    }

    public class RejectInterventionDto
    {
        public string Reason { get; set; } = string.Empty;
    }
}