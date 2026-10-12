using System.Globalization;
using System.Linq.Expressions;
using System.Text;
using System.Text.Json;
using API.DTOs;
using Core.Entities;
using Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace API.Controllers
{
    /// <summary>
    /// Maintenance requests (work orders).
    ///
    /// Life cycle, enforced here and not only in the UI:
    ///   1 À traiter  -> created; may be assigned to a technician (DateAssignation)
    ///   2 En cours   -> the assigned technician accepted it (DatePriseEnCharge)
    ///   3 Réalisée   -> the technician completed it with a work report (DateRealisation)
    ///   4 Clôturée   -> the supervisor validated the work (DateCloture)
    ///   5 Annulée    -> cancelled with a reason
    /// </summary>
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class DemandeInterventionController : ControllerBase
    {
        public const int StatusATraiter = 1;
        public const int StatusEnCours = 2;
        public const int StatusRealisee = 3;
        public const int StatusCloturee = 4;
        public const int StatusAnnulee = 5;

        private const string RoleSuperviseur = "Superviseur";
        private const string RoleDemandeur = "Demandeur";
        private const string RoleTechnicien = "Utilisateur";

        private readonly StoreContext _context;
        private readonly UserManager<AppUser> _userManager;
        private readonly ILogger<DemandeInterventionController> _logger;

        private const long MaxFileSize = 10 * 1024 * 1024; // 10 MB
        private static readonly string[] AllowedExtensions =
        {
            ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".txt", ".csv",
            ".jpg", ".jpeg", ".png", ".gif", ".bmp",
            ".zip", ".rar", ".7z"
        };

        private readonly API.Services.IInterventionEffectsService _effects;

        public DemandeInterventionController(StoreContext context, UserManager<AppUser> userManager, ILogger<DemandeInterventionController> logger,
            API.Services.IInterventionEffectsService effects)
        {
            _context = context;
            _userManager = userManager;
            _logger = logger;
            _effects = effects;
        }

        /// <summary>Audit trail + machine state after a workflow step.</summary>
        private async Task<ActionResult> DoneAsync(DemandeIntervention demande, UserContext user, string action, string? details = null)
        {
            _effects.Audit(user.Entity.ID, $"{user.Entity.Prenom} {user.Entity.Nom}", demande.IdDemandeIntervention, action, details);
            await _context.SaveChangesAsync();
            await _effects.SyncEquipmentStateAsync(demande.IDEquipement);
            return Ok();
        }

        // ------------------------------------------------------------------
        // Current user
        // ------------------------------------------------------------------

        private sealed record UserContext(Users Entity, string Role)
        {
            public bool IsSuperviseur => Role == RoleSuperviseur;
            public bool IsTechnicien => Role == RoleTechnicien;
            public bool IsDemandeur => Role == RoleDemandeur;
        }

        private async Task<UserContext?> GetUserContextAsync()
        {
            var appUser = await _userManager.GetUserAsync(User);
            if (appUser == null) return null;

            var role = (await _userManager.GetRolesAsync(appUser)).FirstOrDefault();
            var entity = await _context.Users.FirstOrDefaultAsync(u => u.AppUserId == appUser.Id && u.IsActif);
            if (role == null || entity == null) return null;

            return new UserContext(entity, role);
        }

        /// <summary>Supervisors see everything; others see what they requested or were assigned.</summary>
        private static IQueryable<DemandeIntervention> ScopeToUser(IQueryable<DemandeIntervention> query, UserContext user)
        {
            if (user.IsSuperviseur) return query;
            if (user.IsDemandeur) return query.Where(d => d.DemandeursID == user.Entity.ID);
            return query.Where(d => d.DemandeursID == user.Entity.ID || d.DestinatairesID == user.Entity.ID);
        }

        private static bool CanView(DemandeIntervention d, UserContext user) =>
            user.IsSuperviseur || d.DemandeursID == user.Entity.ID || d.DestinatairesID == user.Entity.ID;

        private ObjectResult Forbidden(string message) => StatusCode(StatusCodes.Status403Forbidden, new { message });

        // ------------------------------------------------------------------
        // Projection (never returns the file bytes)
        // ------------------------------------------------------------------

        private static readonly Expression<Func<DemandeIntervention, object>> Projection = d => new
        {
            d.IdDemandeIntervention,
            d.Titre,
            d.Description,
            d.CompteRendu,
            d.DateCreation,
            d.FileName,
            d.MachineArretee,
            IdEtat = d.IDEtat,
            d.StatusId,
            IdTypeIntervention = d.IDTypeIntervention,
            IdUrgence = d.IDUrgence,
            IdChaineProduction = d.IDChaineProduction,
            IdPanne = d.IDPanne,
            IdEquipement = d.IDEquipement,
            d.DemandeursID,
            d.DestinatairesID,
            Etat = d.Etat != null ? new { IdEtat = d.Etat.IDEtat, d.Etat.Libelle } : null,
            Status = d.Status != null ? new { d.Status.Id, d.Status.Statut } : null,
            TypeIntervention = d.TypeIntervention != null ? new { IdTypeIntervention = d.TypeIntervention.IDTypeIntervention, d.TypeIntervention.Libelle } : null,
            Urgence = d.Urgence != null ? new { IdUrgence = d.Urgence.IDUrgence, d.Urgence.Libelle } : null,
            ChaineProduction = d.ChaineProduction != null ? new { IdChaineProduction = d.ChaineProduction.IDChaineProduction, d.ChaineProduction.Libelle } : null,
            Panne = d.Panne != null ? new { IdPanne = d.Panne.IDPanne, d.Panne.Libelle } : null,
            Equipement = d.Equipement != null ? new { d.Equipement.IdEquipement, d.Equipement.CodeEquipement, d.Equipement.Designation } : null,
            Demandeur = d.Demandeur != null ? new { Id = d.Demandeur.ID, d.Demandeur.Nom, d.Demandeur.Prenom, d.Demandeur.Email } : null,
            Destinataire = d.Destinataire != null ? new { Id = d.Destinataire.ID, d.Destinataire.Nom, d.Destinataire.Prenom, d.Destinataire.Email } : null,
            d.DateAssignation,
            d.DatePriseEnCharge,
            d.DateRealisation,
            d.DateResolution,
            d.DateCloture,
            d.RaisonAnnulation,
            d.IsActif,
            d.DatePlanifiee,
            d.DureeEstimeeMinutes,
            d.Cause,
            d.Remede,
            d.IdPlanPreventif,
            PlanPreventif = d.PlanPreventif != null ? new { d.PlanPreventif.Id, d.PlanPreventif.Code } : null
        };

        private Task<object?> LoadDtoAsync(int id) =>
            _context.DemandeInterventions
                .Where(d => d.IdDemandeIntervention == id)
                .Select(Projection)
                .FirstOrDefaultAsync();

        // ------------------------------------------------------------------
        // Queries
        // ------------------------------------------------------------------

        [HttpGet]
        public async Task<ActionResult<PagedResult<object>>> GetDemandeInterventions(int page = 1, int pageSize = 10, string? search = null, int? statusId = null)
        {
            var user = await GetUserContextAsync();
            if (user == null) return Unauthorized();

            page = Math.Max(1, page);
            pageSize = Math.Clamp(pageSize, 1, 100);

            var query = ScopeToUser(_context.DemandeInterventions.Where(d => d.IsActif), user);

            if (statusId.HasValue) query = query.Where(d => d.StatusId == statusId.Value);

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim().ToLower();
                // A reference typed as "INT-0042" or "42" finds the work order itself
                var reference = System.Text.RegularExpressions.Regex.Match(term, @"^(?:int-?)?0*(\d{1,7})$");
                int? searchId = reference.Success ? int.Parse(reference.Groups[1].Value) : null;
                query = query.Where(d =>
                    (searchId != null && d.IdDemandeIntervention == searchId) ||
                    d.Titre.ToLower().Contains(term) ||
                    (d.Description != null && d.Description.ToLower().Contains(term)) ||
                    (d.Equipement != null && (d.Equipement.CodeEquipement.ToLower().Contains(term) || d.Equipement.Designation.ToLower().Contains(term))) ||
                    d.ChaineProduction.Libelle.ToLower().Contains(term));
            }

            var totalCount = await query.CountAsync();
            var items = await query
                .OrderByDescending(d => d.DateCreation)
                .ThenByDescending(d => d.IdDemandeIntervention)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(Projection)
                .ToListAsync();

            return Ok(new PagedResult<object> { Data = items, TotalCount = totalCount, Page = page, PageSize = pageSize });
        }

        /// <summary>
        /// Work orders of a calendar range for the planning screen: planned jobs on their
        /// planned date, others on their declaration date. Same visibility rules as the list.
        /// </summary>
        [HttpGet("calendrier")]
        public async Task<ActionResult<object>> GetCalendar(DateTime from, DateTime to)
        {
            var user = await GetUserContextAsync();
            if (user == null) return Unauthorized();
            from = from.Date;
            var end = to.Date.AddDays(1);
            if (end <= from || (end - from).TotalDays > 120) return BadRequest(new { message = "Période invalide (120 jours au maximum)." });

            var items = await ScopeToUser(_context.DemandeInterventions.Where(d => d.IsActif), user)
                .Where(d => (d.DatePlanifiee ?? d.DateCreation) >= from && (d.DatePlanifiee ?? d.DateCreation) < end)
                .OrderBy(d => d.DatePlanifiee ?? d.DateCreation)
                .Take(2000)
                .Select(Projection)
                .ToListAsync();
            return Ok(new { data = items, totalCount = items.Count, page = 1, pageSize = items.Count });
        }

        [HttpGet("today-count")]
        public async Task<ActionResult<int>> GetTodayInterventionCount()
        {
            var user = await GetUserContextAsync();
            if (user == null) return Unauthorized();

            var today = DateTime.Now.Date;
            var tomorrow = today.AddDays(1);
            var count = await ScopeToUser(_context.DemandeInterventions, user)
                .CountAsync(d => d.IsActif && d.DateCreation >= today && d.DateCreation < tomorrow);
            return Ok(count);
        }

        [HttpGet("{id:int}")]
        public async Task<ActionResult<object>> GetDemandeIntervention(int id)
        {
            var user = await GetUserContextAsync();
            if (user == null) return Unauthorized();

            var demande = await _context.DemandeInterventions.AsNoTracking()
                .FirstOrDefaultAsync(d => d.IdDemandeIntervention == id && d.IsActif);
            if (demande == null) return NotFound(new { message = "Intervention introuvable." });
            if (!CanView(demande, user)) return Forbidden("Vous n'avez pas accès à cette intervention.");

            return Ok(await LoadDtoAsync(id));
        }

        [HttpGet("{id:int}/file")]
        public async Task<IActionResult> GetFile(int id)
        {
            var user = await GetUserContextAsync();
            if (user == null) return Unauthorized();

            var demande = await _context.DemandeInterventions.FirstOrDefaultAsync(d => d.IdDemandeIntervention == id && d.IsActif);
            if (demande == null || demande.FileData == null || demande.ContentType == null)
                return NotFound(new { message = "Fichier introuvable." });
            if (!CanView(demande, user)) return Forbidden("Vous n'avez pas accès à ce fichier.");

            return File(demande.FileData, demande.ContentType, demande.FileName ?? "piece-jointe");
        }

        // ------------------------------------------------------------------
        // Create / update
        // ------------------------------------------------------------------

        private async Task<(InterventionDto? dto, IFormFile? file, IFormCollection? form, string? error)> ReadRequestAsync()
        {
            try
            {
                if (Request.HasFormContentType)
                {
                    var form = await Request.ReadFormAsync();
                    var json = form["interventionData"].ToString();
                    if (string.IsNullOrWhiteSpace(json)) return (null, null, form, "Données de l'intervention manquantes.");
                    var dto = JsonSerializer.Deserialize<InterventionDto>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                    return (dto, form.Files.GetFile("file"), form, dto == null ? "Données de l'intervention invalides." : null);
                }

                var jsonDto = await Request.ReadFromJsonAsync<InterventionDto>();
                return (jsonDto, null, null, jsonDto == null ? "Données de l'intervention invalides." : null);
            }
            catch (JsonException)
            {
                return (null, null, null, "Données de l'intervention invalides.");
            }
        }

        private static string? ValidateFile(IFormFile file)
        {
            if (file.Length > MaxFileSize) return $"La pièce jointe dépasse {MaxFileSize / (1024 * 1024)} Mo.";
            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!AllowedExtensions.Contains(extension)) return $"Type de fichier non autorisé. Types acceptés : {string.Join(", ", AllowedExtensions)}";
            return null;
        }

        private static async Task AttachFileAsync(DemandeIntervention demande, IFormFile file)
        {
            using var memoryStream = new MemoryStream();
            await file.CopyToAsync(memoryStream);
            demande.FileData = memoryStream.ToArray();
            demande.FileName = Path.GetFileName(file.FileName);
            demande.ContentType = string.IsNullOrWhiteSpace(file.ContentType) ? "application/octet-stream" : file.ContentType;
        }

        private static string Normalize(string value)
        {
            var decomposed = value.ToLowerInvariant().Normalize(NormalizationForm.FormD);
            var sb = new StringBuilder();
            foreach (var c in decomposed)
                if (CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark) sb.Append(c);
            return sb.ToString();
        }

        private static bool IsPreventive(string typeLibelle) =>
            Normalize(typeLibelle).Contains("prevent") || typeLibelle.Contains("ventive", StringComparison.OrdinalIgnoreCase);

        /// <summary>
        /// Validates the descriptive fields shared by create and update and applies them.
        /// Business rules: a machine implies its production line; a stop is implied by
        /// every non-preventive request; the breakdown type is required for corrective work.
        /// </summary>
        private async Task<string?> ApplyDescriptiveFieldsAsync(DemandeIntervention demande, InterventionDto dto, bool isCreate)
        {
            var titre = dto.Titre?.Trim();
            if (isCreate || titre != null)
            {
                if (string.IsNullOrWhiteSpace(titre) || titre.Length < 3) return "Le titre est obligatoire (3 caractères minimum).";
                if (titre.Length > 100) return "Le titre ne doit pas dépasser 100 caractères.";
                demande.Titre = titre;
            }

            if (dto.Description != null)
            {
                var description = dto.Description.Trim();
                if (description.Length > 2000) return "La description ne doit pas dépasser 2000 caractères.";
                demande.Description = description.Length == 0 ? null : description;
            }

            // Type
            var typeId = dto.IDTypeIntervention ?? (isCreate ? null : demande.IDTypeIntervention);
            if (typeId == null) return "Le type d'intervention est obligatoire.";
            var type = await _context.TypeInterventions.FirstOrDefaultAsync(t => t.IDTypeIntervention == typeId && t.IsActif);
            if (type == null) return "Type d'intervention invalide.";
            demande.IDTypeIntervention = type.IDTypeIntervention;
            demande.MachineArretee = !IsPreventive(type.Libelle);

            // Urgency
            var urgenceId = dto.IDUrgence ?? (isCreate ? null : demande.IDUrgence);
            if (urgenceId == null || !await _context.Urgences.AnyAsync(u => u.IDUrgence == urgenceId && u.IsActif))
                return "Le niveau d'urgence est obligatoire.";
            demande.IDUrgence = urgenceId.Value;

            // Machine and production line
            if (dto.IDEquipement.HasValue && dto.IDEquipement.Value > 0)
            {
                var equipement = await _context.Equipments.FirstOrDefaultAsync(e => e.IdEquipement == dto.IDEquipement && !e.IsDeleted);
                if (equipement == null) return "Équipement invalide.";
                demande.IDEquipement = equipement.IdEquipement;
                if (equipement.IdChaineProduction.HasValue) demande.IDChaineProduction = equipement.IdChaineProduction.Value;
            }
            else if (dto.IDEquipement.HasValue)
            {
                demande.IDEquipement = null; // explicitly cleared
            }

            var equipementLine = demande.IDEquipement.HasValue
                ? await _context.Equipments.Where(e => e.IdEquipement == demande.IDEquipement).Select(e => e.IdChaineProduction).FirstOrDefaultAsync()
                : null;
            if (!equipementLine.HasValue)
            {
                var chaineId = dto.IDChaineProduction ?? (isCreate ? null : demande.IDChaineProduction);
                if (chaineId == null || !await _context.ChaineProductions.AnyAsync(c => c.IDChaineProduction == chaineId && c.IsActif))
                    return "La chaîne de production est obligatoire.";
                demande.IDChaineProduction = chaineId.Value;
            }

            // Breakdown type: required for corrective work, defaulted for preventive work
            var panneId = dto.IDPanne ?? (isCreate ? null : demande.IDPanne);
            if (panneId.HasValue && panneId.Value > 0)
            {
                if (!await _context.Pannes.AnyAsync(p => p.IDPanne == panneId && p.IsActif)) return "Type de panne invalide.";
                demande.IDPanne = panneId.Value;
            }
            else if (demande.MachineArretee)
            {
                return "Le type de panne est obligatoire pour une intervention corrective.";
            }
            else
            {
                var fallback = await _context.Pannes.Where(p => p.IsActif).OrderBy(p => p.IDPanne).Select(p => (int?)p.IDPanne).FirstOrDefaultAsync();
                if (fallback == null) return "Aucun type de panne n'est configuré.";
                demande.IDPanne = fallback.Value;
            }

            return null;
        }

        /// <summary>Keeps the legacy "Etat" column consistent with the workflow status.</summary>
        private async Task SyncEtatAsync(DemandeIntervention demande)
        {
            string? keyword = demande.StatusId switch
            {
                StatusATraiter => "nouveau",
                StatusEnCours => "cours",
                StatusRealisee or StatusCloturee => "termin",
                _ => null
            };
            if (keyword == null) return;

            var etats = await _context.Etats.Where(e => e.IsActif).ToListAsync();
            var match = etats.FirstOrDefault(e => Normalize(e.Libelle).Contains(keyword));
            if (match != null) demande.IDEtat = match.IDEtat;
        }

        [HttpPost]
        public async Task<ActionResult<object>> CreateDemandeIntervention()
        {
            var user = await GetUserContextAsync();
            if (user == null) return Unauthorized();

            var (dto, file, _, readError) = await ReadRequestAsync();
            if (readError != null || dto == null) return BadRequest(new { message = readError });

            var demande = new DemandeIntervention
            {
                // Server-side facts: never taken from the client
                DateCreation = DateTime.Now,
                DemandeursID = user.Entity.ID,
                StatusId = StatusATraiter,
                IsActif = true
            };

            var error = await ApplyDescriptiveFieldsAsync(demande, dto, isCreate: true);
            if (error != null) return BadRequest(new { message = error });

            // Only a supervisor can assign a technician at creation time
            if (user.IsSuperviseur && dto.DestinatairesID.HasValue)
            {
                var tech = await FindActiveTechnicianAsync(dto.DestinatairesID.Value);
                if (tech == null) return BadRequest(new { message = "Le technicien sélectionné est invalide." });
                demande.DestinatairesID = tech.ID;
                demande.DateAssignation = DateTime.Now;
            }

            if (file != null && file.Length > 0)
            {
                var fileError = ValidateFile(file);
                if (fileError != null) return BadRequest(new { message = fileError });
                await AttachFileAsync(demande, file);
            }

            await SyncEtatAsync(demande);
            if (demande.IDEtat == 0)
                demande.IDEtat = await _context.Etats.Where(e => e.IsActif).OrderBy(e => e.IDEtat).Select(e => e.IDEtat).FirstOrDefaultAsync();

            _context.DemandeInterventions.Add(demande);
            await _context.SaveChangesAsync();
            _effects.Audit(user.Entity.ID, $"{user.Entity.Prenom} {user.Entity.Nom}", demande.IdDemandeIntervention, "Déclaration", demande.MachineArretee ? "Machine à l'arrêt" : null);
            await _context.SaveChangesAsync();
            await _effects.SyncEquipmentStateAsync(demande.IDEquipement);
            _logger.LogInformation("Intervention {Id} created by user {UserId}", demande.IdDemandeIntervention, user.Entity.ID);

            if (!user.IsSuperviseur)
                await NotifySupervisorsAsync("Nouvelle demande d'intervention", $"« {demande.Titre} » a été déclarée par {user.Entity.Prenom} {user.Entity.Nom}.", "intervention_created", user.Entity.ID, demande.IdDemandeIntervention);
            if (demande.DestinatairesID.HasValue)
                await NotifyAsync(demande.DestinatairesID.Value, "Nouvelle intervention assignée", $"L'intervention « {demande.Titre} » vous a été assignée.", "intervention_assigned", user.Entity.ID, demande.IdDemandeIntervention);

            return CreatedAtAction(nameof(GetDemandeIntervention), new { id = demande.IdDemandeIntervention }, await LoadDtoAsync(demande.IdDemandeIntervention));
        }

        [HttpPut("{id:int}")]
        public async Task<ActionResult<object>> UpdateDemandeIntervention(int id)
        {
            var user = await GetUserContextAsync();
            if (user == null) return Unauthorized();

            var (dto, file, form, readError) = await ReadRequestAsync();
            if (readError != null || dto == null) return BadRequest(new { message = readError });

            var demande = await _context.DemandeInterventions.FirstOrDefaultAsync(d => d.IdDemandeIntervention == id && d.IsActif);
            if (demande == null) return NotFound(new { message = "Intervention introuvable." });

            // Who may edit the request description?
            //  - the supervisor, until the request is closed or cancelled
            //  - the requester, only while nobody has taken it on yet
            var isOwnerStillEditable = demande.DemandeursID == user.Entity.ID
                                       && demande.StatusId == StatusATraiter
                                       && demande.DatePriseEnCharge == null;
            if (!user.IsSuperviseur && !isOwnerStillEditable)
                return Forbidden("Cette demande ne peut plus être modifiée : elle a déjà été prise en charge.");
            if (demande.StatusId is StatusCloturee or StatusAnnulee)
                return BadRequest(new { message = "Une intervention clôturée ou annulée ne peut plus être modifiée." });

            var machineAvant = demande.IDEquipement;
            var error = await ApplyDescriptiveFieldsAsync(demande, dto, isCreate: false);
            if (error != null) return BadRequest(new { message = error });

            if (file != null && file.Length > 0)
            {
                var fileError = ValidateFile(file);
                if (fileError != null) return BadRequest(new { message = fileError });
                await AttachFileAsync(demande, file);
            }
            else if (form != null && form.ContainsKey("fileName") && string.IsNullOrEmpty(form["fileName"]))
            {
                demande.FileData = null;
                demande.FileName = null;
                demande.ContentType = null;
            }

            _effects.Audit(user.Entity.ID, $"{user.Entity.Prenom} {user.Entity.Nom}", id, "Modification de la demande");
            await _context.SaveChangesAsync();
            await _effects.SyncEquipmentStateAsync(machineAvant, demande.IDEquipement);
            return Ok(await LoadDtoAsync(id));
        }

        [HttpDelete("{id:int}")]
        [Authorize(Roles = RoleSuperviseur)]
        public async Task<IActionResult> DeleteDemandeIntervention(int id)
        {
            var demande = await _context.DemandeInterventions.FirstOrDefaultAsync(d => d.IdDemandeIntervention == id && d.IsActif);
            if (demande == null) return NotFound(new { message = "Intervention introuvable." });
            var actor = await GetUserContextAsync();
            await using var tx = await _context.Database.BeginTransactionAsync();
            var rendues = await _effects.ReturnPartsAsync(id, actor?.Entity.ID, "Retour magasin (intervention supprimée)");
            demande.IsActif = false;
            _effects.Audit(actor?.Entity.ID, actor != null ? $"{actor.Entity.Prenom} {actor.Entity.Nom}" : null, id, "Suppression", rendues > 0 ? $"{rendues} pièce(s) remise(s) en stock" : null);
            await _context.SaveChangesAsync();
            await tx.CommitAsync();
            await _effects.SyncEquipmentStateAsync(demande.IDEquipement);
            return NoContent();
        }

        // ------------------------------------------------------------------
        // Workflow
        // ------------------------------------------------------------------

        private Task<Users?> FindActiveTechnicianAsync(int userId) =>
            _context.Users.Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.ID == userId && u.IsActif && u.Role.Libelle == RoleTechnicien);

        [HttpPost("{id:int}/assign")]
        [Authorize(Roles = RoleSuperviseur)]
        public async Task<ActionResult> AssignTechnician(int id, [FromBody] AssignTechnicianDto dto)
        {
            var user = await GetUserContextAsync();
            if (user == null) return Unauthorized();

            var demande = await _context.DemandeInterventions.FirstOrDefaultAsync(d => d.IdDemandeIntervention == id && d.IsActif);
            if (demande == null) return NotFound(new { message = "Intervention introuvable." });
            if (demande.StatusId is not (StatusATraiter or StatusEnCours))
                return BadRequest(new { message = "Seule une intervention à traiter ou en cours peut être (ré)affectée." });

            if (!int.TryParse(dto.TechnicianId, out var techId)) return BadRequest(new { message = "Technicien invalide." });
            var tech = await FindActiveTechnicianAsync(techId);
            if (tech == null) return BadRequest(new { message = "Le technicien sélectionné est invalide ou inactif." });

            var previous = demande.DestinatairesID;
            demande.DestinatairesID = tech.ID;
            demande.DateAssignation = DateTime.Now;
            if (previous != tech.ID)
            {
                // A new technician has to accept the job again
                demande.DatePriseEnCharge = null;
                demande.StatusId = StatusATraiter;
                demande.RaisonAnnulation = null;
            }
            await SyncEtatAsync(demande);
            await _context.SaveChangesAsync();

            await NotifyAsync(tech.ID, "Nouvelle intervention assignée", $"L'intervention « {demande.Titre} » vous a été assignée.", "intervention_assigned", user.Entity.ID, id);
            if (previous.HasValue && previous != tech.ID)
                await NotifyAsync(previous.Value, "Intervention réaffectée", $"L'intervention « {demande.Titre} » a été confiée à un autre technicien.", "intervention_cancelled", user.Entity.ID, id);

            return await DoneAsync(demande, user, "Affectation", $"{tech.Prenom} {tech.Nom}");
        }

        [HttpPost("{id:int}/accept")]
        public async Task<ActionResult> AcceptIntervention(int id)
        {
            var user = await GetUserContextAsync();
            if (user == null) return Unauthorized();

            var demande = await _context.DemandeInterventions.FirstOrDefaultAsync(d => d.IdDemandeIntervention == id && d.IsActif);
            if (demande == null) return NotFound(new { message = "Intervention introuvable." });
            return await AcceptAsync(demande, user);
        }

        private async Task<ActionResult> AcceptAsync(DemandeIntervention demande, UserContext user)
        {
            if (demande.DestinatairesID != user.Entity.ID) return Forbidden("Cette intervention ne vous est pas assignée.");
            if (demande.StatusId != StatusATraiter || demande.DatePriseEnCharge != null)
                return BadRequest(new { message = "Cette intervention a déjà été prise en charge." });

            demande.StatusId = StatusEnCours;
            demande.DatePriseEnCharge = DateTime.Now;
            await SyncEtatAsync(demande);
            await _context.SaveChangesAsync();

            await NotifySupervisorsAsync("Intervention prise en charge", $"« {demande.Titre} » a été prise en charge par {user.Entity.Prenom} {user.Entity.Nom}.", "intervention_started", user.Entity.ID, demande.IdDemandeIntervention);
            await NotifyRequesterAsync(demande, user, "Votre demande est prise en charge", $"Un technicien intervient sur « {demande.Titre} ».", "intervention_started");
            return await DoneAsync(demande, user, "Prise en charge");
        }

        [HttpPost("{id:int}/reject")]
        public async Task<ActionResult> RejectIntervention(int id, [FromBody] RejectInterventionDto dto)
        {
            var user = await GetUserContextAsync();
            if (user == null) return Unauthorized();

            var demande = await _context.DemandeInterventions.FirstOrDefaultAsync(d => d.IdDemandeIntervention == id && d.IsActif);
            if (demande == null) return NotFound(new { message = "Intervention introuvable." });
            if (demande.DestinatairesID != user.Entity.ID) return Forbidden("Cette intervention ne vous est pas assignée.");
            if (demande.DatePriseEnCharge != null || demande.StatusId != StatusATraiter)
                return BadRequest(new { message = "Une intervention déjà acceptée ne peut plus être refusée." });
            if (string.IsNullOrWhiteSpace(dto.Reason)) return BadRequest(new { message = "Le motif du refus est obligatoire." });

            demande.DestinatairesID = null;
            demande.DateAssignation = null;
            demande.RaisonAnnulation = $"Refusée par {user.Entity.Prenom} {user.Entity.Nom} : {dto.Reason.Trim()}";
            await _context.SaveChangesAsync();

            await NotifySupervisorsAsync("Intervention refusée", $"« {demande.Titre} » a été refusée par {user.Entity.Prenom} {user.Entity.Nom}. Motif : {dto.Reason.Trim()}", "intervention_rejected", user.Entity.ID, id);
            return await DoneAsync(demande, user, "Refus du technicien", dto.Reason.Trim());
        }

        /// <summary>
        /// Status transitions used by the planning screen:
        ///   2 = accept (assigned technician) or reopen after refused validation (supervisor)
        ///   3 = complete (assigned technician, work report required)
        ///   4 = close / validate (supervisor)
        /// </summary>
        [HttpPatch("{id:int}/status")]
        public async Task<ActionResult> UpdateStatus(int id, [FromBody] UpdateStatusDto dto)
        {
            var user = await GetUserContextAsync();
            if (user == null) return Unauthorized();

            var demande = await _context.DemandeInterventions.FirstOrDefaultAsync(d => d.IdDemandeIntervention == id && d.IsActif);
            if (demande == null) return NotFound(new { message = "Intervention introuvable." });

            switch (dto.StatusId)
            {
                case StatusEnCours when user.IsSuperviseur && demande.StatusId == StatusRealisee:
                    // Supervisor refuses the work: back to the technician
                    demande.StatusId = StatusEnCours;
                    demande.DateRealisation = null;
                    demande.DateResolution = null;
                    await SyncEtatAsync(demande);
                    await _context.SaveChangesAsync();
                    if (demande.DestinatairesID.HasValue)
                        await NotifyAsync(demande.DestinatairesID.Value, "Intervention à reprendre", $"La réalisation de « {demande.Titre} » n'a pas été validée.", "intervention_started", user.Entity.ID, id);
                    return await DoneAsync(demande, user, "Renvoyée au technicien");

                case StatusEnCours:
                    return await AcceptAsync(demande, user);

                case StatusRealisee:
                    if (demande.DestinatairesID != user.Entity.ID) return Forbidden("Seul le technicien assigné peut terminer cette intervention.");
                    if (demande.StatusId != StatusEnCours) return BadRequest(new { message = "L'intervention doit être en cours pour être terminée." });
                    var report = dto.CompteRendu?.Trim();
                    if (string.IsNullOrWhiteSpace(report) || report.Length < 10)
                        return BadRequest(new { message = "Le compte rendu d'intervention est obligatoire (10 caractères minimum)." });
                    if (report.Length > 2000) return BadRequest(new { message = "Le compte rendu ne doit pas dépasser 2000 caractères." });

                    demande.CompteRendu = report;
                    demande.StatusId = StatusRealisee;
                    demande.DatePriseEnCharge ??= demande.DateAssignation ?? DateTime.Now;
                    demande.DateRealisation = DateTime.Now;
                    demande.DateResolution = demande.DateRealisation;
                    await SyncEtatAsync(demande);
                    await _context.SaveChangesAsync();

                    await NotifySupervisorsAsync("Intervention réalisée", $"« {demande.Titre} » est terminée et attend votre validation.", "intervention_completed", user.Entity.ID, id);
                    return await DoneAsync(demande, user, "Travaux réalisés", report);

                case StatusCloturee:
                    if (!user.IsSuperviseur) return Forbidden("Seul un superviseur peut clôturer une intervention.");
                    if (demande.StatusId != StatusRealisee) return BadRequest(new { message = "Seule une intervention réalisée peut être clôturée." });

                    demande.StatusId = StatusCloturee;
                    demande.DateCloture = DateTime.Now;
                    await SyncEtatAsync(demande);
                    await _context.SaveChangesAsync();

                    if (demande.DestinatairesID.HasValue)
                        await NotifyAsync(demande.DestinatairesID.Value, "Intervention clôturée", $"« {demande.Titre} » a été validée et clôturée.", "intervention_closed", user.Entity.ID, id);
                    await NotifyRequesterAsync(demande, user, "Votre demande est clôturée", $"L'intervention « {demande.Titre} » est terminée et validée.", "intervention_closed");
                    return await DoneAsync(demande, user, "Clôture");

                default:
                    return BadRequest(new { message = "Changement de statut non autorisé." });
            }
        }

        [HttpPost("{id:int}/cancel")]
        public async Task<ActionResult> CancelIntervention(int id, [FromBody] CancelInterventionDto dto)
        {
            var user = await GetUserContextAsync();
            if (user == null) return Unauthorized();

            var demande = await _context.DemandeInterventions.FirstOrDefaultAsync(d => d.IdDemandeIntervention == id && d.IsActif);
            if (demande == null) return NotFound(new { message = "Intervention introuvable." });
            if (demande.StatusId is StatusCloturee or StatusAnnulee)
                return BadRequest(new { message = "Cette intervention est déjà clôturée ou annulée." });

            var canCancel = user.IsSuperviseur
                || (demande.DemandeursID == user.Entity.ID && demande.StatusId == StatusATraiter && demande.DatePriseEnCharge == null);
            if (!canCancel) return Forbidden("Vous ne pouvez pas annuler cette intervention à ce stade.");
            if (string.IsNullOrWhiteSpace(dto.Reason)) return BadRequest(new { message = "Le motif d'annulation est obligatoire." });

            // Parts already issued to this job go back to the store
            await using var tx = await _context.Database.BeginTransactionAsync();
            var rendues = await _effects.ReturnPartsAsync(id, user.Entity.ID, "Retour magasin (intervention annulée)");
            demande.StatusId = StatusAnnulee;
            demande.RaisonAnnulation = dto.Reason.Trim();
            _effects.Audit(user.Entity.ID, $"{user.Entity.Prenom} {user.Entity.Nom}", id, "Annulation",
                demande.RaisonAnnulation + (rendues > 0 ? $" — {rendues} pièce(s) remise(s) en stock" : ""));
            await _context.SaveChangesAsync();
            await tx.CommitAsync();
            await _effects.SyncEquipmentStateAsync(demande.IDEquipement);

            if (demande.DestinatairesID.HasValue && demande.DestinatairesID != user.Entity.ID)
                await NotifyAsync(demande.DestinatairesID.Value, "Intervention annulée", $"« {demande.Titre} » a été annulée.", "intervention_cancelled", user.Entity.ID, id);
            if (!user.IsSuperviseur)
                await NotifySupervisorsAsync("Demande annulée", $"« {demande.Titre} » a été annulée par son demandeur.", "intervention_cancelled", user.Entity.ID, id);
            else
                await NotifyRequesterAsync(demande, user, "Votre demande a été annulée", $"« {demande.Titre} » a été annulée. Motif : {demande.RaisonAnnulation}", "intervention_cancelled");
            return Ok();
        }

        // ------------------------------------------------------------------
        // Legacy dashboard summary (cards + recent list)
        // ------------------------------------------------------------------

        [HttpGet("dashboard-stats")]
        public async Task<ActionResult<object>> GetDashboardStats()
        {
            var user = await GetUserContextAsync();
            if (user == null) return Unauthorized();

            var scoped = ScopeToUser(_context.DemandeInterventions.Where(d => d.IsActif), user);

            var interventionStats = new
            {
                enAttente = await scoped.CountAsync(d => d.StatusId == StatusATraiter),
                enCours = await scoped.CountAsync(d => d.StatusId == StatusEnCours),
                terminee = await scoped.CountAsync(d => d.StatusId == StatusRealisee || d.StatusId == StatusCloturee),
                annulee = await scoped.CountAsync(d => d.StatusId == StatusAnnulee)
            };

            // Machines: real equipment, not production lines
            var totalMachines = await _context.Equipments.CountAsync(e => !e.IsDeleted);
            var openStops = scoped.Where(d => d.MachineArretee && (d.StatusId == StatusATraiter || d.StatusId == StatusEnCours));
            var stoppedMachines = await openStops.Where(d => d.IDEquipement != null).Select(d => d.IDEquipement).Distinct().CountAsync();
            stoppedMachines = Math.Min(stoppedMachines, totalMachines);

            var machineStats = new
            {
                arretees = stoppedMachines,
                enFonctionnement = totalMachines - stoppedMachines,
                total = totalMachines,
                pourcentageArretees = totalMachines > 0 ? Math.Round((double)stoppedMachines / totalMachines * 100, 1) : 0
            };

            var recentInterventions = await scoped
                .OrderByDescending(d => d.DateCreation)
                .Take(6)
                .Select(d => new { idDemandeIntervention = d.IdDemandeIntervention, titre = d.Titre, dateCreation = d.DateCreation, status = new { id = d.Status.Id, statut = d.Status.Statut } })
                .ToListAsync();

            var sixMonthsAgo = new DateTime(DateTime.Now.Year, DateTime.Now.Month, 1).AddMonths(-5);
            var monthlyData = await scoped.Where(d => d.DateCreation >= sixMonthsAgo)
                .GroupBy(d => new { d.DateCreation.Year, d.DateCreation.Month })
                .Select(g => new { year = g.Key.Year, month = g.Key.Month, count = g.Count() })
                .OrderBy(d => d.year).ThenBy(d => d.month)
                .ToListAsync();

            // Open work only: an urgency counter must not grow forever with closed jobs
            var urgenceData = await scoped
                .Where(d => d.StatusId == StatusATraiter || d.StatusId == StatusEnCours)
                .GroupBy(d => new { d.IDUrgence, d.Urgence.Libelle })
                .Select(g => new { id = g.Key.IDUrgence, libelle = g.Key.Libelle, count = g.Count() })
                .ToListAsync();

            return Ok(new { interventionStats, machineStats, recentInterventions, monthlyData, urgenceData });
        }

        // ------------------------------------------------------------------
        // Notifications
        // ------------------------------------------------------------------

        private Task NotifyAsync(int userId, string title, string message, string type, int? triggeredBy, int interventionId) =>
            NotificationController.CreateNotificationAsync(_context, title, message, type, userId, triggeredBy, interventionId);

        private async Task NotifySupervisorsAsync(string title, string message, string type, int triggeredBy, int interventionId)
        {
            var supervisorIds = await _context.Users
                .Where(u => u.IsActif && u.Role.Libelle == RoleSuperviseur && u.ID != triggeredBy)
                .Select(u => u.ID)
                .ToListAsync();
            foreach (var supervisorId in supervisorIds)
                await NotifyAsync(supervisorId, title, message, type, triggeredBy, interventionId);
        }

        private Task NotifyRequesterAsync(DemandeIntervention demande, UserContext actor, string title, string message, string type) =>
            demande.DemandeursID == actor.Entity.ID
                ? Task.CompletedTask
                : NotifyAsync(demande.DemandeursID, title, message, type, actor.Entity.ID, demande.IdDemandeIntervention);
    }

    public class AssignTechnicianDto
    {
        public string TechnicianId { get; set; } = string.Empty;
    }

    public class UpdateStatusDto
    {
        public int StatusId { get; set; }
        public string? CompteRendu { get; set; }
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
