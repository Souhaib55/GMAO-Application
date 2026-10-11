using API.Security;
using API.DTOs;
using Core.Entities;
using Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace API.Controllers
{
    [SupervisorWrites]
    [ApiController]
    [Route("api/[controller]")]
    public class EquipmentController : ControllerBase
    {
        private readonly StoreContext _context;
        private readonly ILogger<EquipmentController> _logger;

        public EquipmentController(StoreContext context, ILogger<EquipmentController> logger)
        {
            _context = context;
            _logger = logger;
        }

        // GET: api/Equipment
        [HttpGet]
        public async Task<ActionResult<PagedResult<object>>> GetEquipments(int page = 1, int pageSize = 5, string search = null)
        {
            var query = _context.Equipments
                .Where(e => !e.IsDeleted);

            // Appliquer le filtre de recherche par code d'équipement si le paramètre search est fourni
            if (!string.IsNullOrWhiteSpace(search))
            {
                search = search.ToLower().Trim();
                query = query.Where(e => e.CodeEquipement.ToLower().Contains(search) || e.Designation.ToLower().Contains(search));
                _logger.LogInformation($"Applying search filter: '{search}'");
            }

            query = query
                .Include(e => e.Criticite)
                .Include(e => e.Etat)
                .Include(e => e.Famille)
                .Include(e => e.Modele).ThenInclude(m => m.Marque)
                .Include(e => e.Groupe)
                .Include(e => e.ChaineProduction);

            page = Math.Max(1, page);
            pageSize = Math.Clamp(pageSize, 1, 100);

            var totalCount = await query.CountAsync();
            var items = await query
                .OrderBy(e => e.IdEquipement)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(e => new
                {
                    e.IdEquipement,
                    e.CodeEquipement,
                    e.Designation,
                    e.Description,
                    e.IdCriticite,
                    Criticite = e.Criticite != null ? new { e.Criticite.IdCriticite, e.Criticite.NomCriticite } : null,
                    e.IdEtat,
                    Etat = e.Etat != null ? new { e.Etat.IdEtat, e.Etat.NomEtat } : null,
                    e.IdFamille,
                    Famille = e.Famille != null ? new { e.Famille.IdFamille, e.Famille.NomFamille } : null,
                    e.IdModele,
                    Modele = e.Modele != null ? new { e.Modele.IdModele, e.Modele.NomModele, Marque = e.Modele.Marque != null ? new { e.Modele.Marque.IdMarque, e.Modele.Marque.NomMarque } : null } : null,
                    e.IdGroupe,
                    Groupe = e.Groupe != null ? new { e.Groupe.IdGroupe, e.Groupe.NomGroupe } : null,
                    e.IdChaineProduction,
                    ChaineProduction = e.ChaineProduction != null ? new { IdChaineProduction = e.ChaineProduction.IDChaineProduction, e.ChaineProduction.Libelle } : null,
                    e.DateInstallation,
                    e.DateMiseEnService,
                    e.NumeroSerie,
                    e.SousGarantie,
                    e.DateAchat,
                    e.DateFinGarantie,
                    e.DateConstruction,
                    e.CoutAchat,
                    e.DateCreation,
                    e.DateModification,
                    e.IsDeleted
                })
                .ToListAsync();

            _logger.LogInformation($"Retrieved {items.Count} equipments out of {totalCount} total (page {page}, pageSize {pageSize})");

            return Ok(new pagedResult<object>
            {
                data = items.Cast<object>().ToList(),
                totalCount = totalCount,
                page = page,
                pageSize = pageSize
            });
        }

        // GET: api/Equipment/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Equipment>> GetEquipment(int id)
        {
            var equipment = await _context.Equipments
                .Include(e => e.Criticite)
                .Include(e => e.Etat)
                .Include(e => e.Famille)
                .Include(e => e.Modele).ThenInclude(m => m.Marque)
                .Include(e => e.Groupe)
                .Include(e => e.ChaineProduction)
                .FirstOrDefaultAsync(e => e.IdEquipement == id && !e.IsDeleted);

            if (equipment == null)
            {
                _logger.LogWarning($"Equipment with ID {id} not found or deleted.");
                return NotFound("Equipment not found or deleted.");
            }

            return Ok(equipment);
        }

        // POST: api/Equipment
        [HttpPost]
        public async Task<ActionResult<Equipment>> CreateEquipment([FromBody] EquipmentDto equipmentDto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var ruleError = await ValidateBusinessRulesAsync(equipmentDto);
            if (ruleError != null) return BadRequest(ruleError);

            // The unique index covers deleted rows too
            if (await _context.Equipments.AnyAsync(e => e.CodeEquipement == equipmentDto.CodeEquipement))
            {
                return BadRequest("Ce code équipement est déjà utilisé (y compris par un équipement supprimé).");
            }

            // Validate foreign keys only if they have values
            if (equipmentDto.IdCriticite.HasValue && !await _context.EquipmentCriticites.AnyAsync(c => c.IdCriticite == equipmentDto.IdCriticite.Value && c.IsActif))
                return BadRequest("Invalid or inactive Criticite ID.");
            if (equipmentDto.IdEtat.HasValue && !await _context.EtatEquipements.AnyAsync(e => e.IdEtat == equipmentDto.IdEtat.Value && e.IsActif))
                return BadRequest("Invalid or inactive Etat ID.");
            if (equipmentDto.IdFamille.HasValue && !await _context.FamilleEquipements.AnyAsync(f => f.IdFamille == equipmentDto.IdFamille.Value && f.IsActif))
                return BadRequest("Invalid or inactive Famille ID.");
            if (equipmentDto.IdModele.HasValue && !await _context.ModeleEquipements.AnyAsync(m => m.IdModele == equipmentDto.IdModele.Value && m.IsActif))
                return BadRequest("Invalid or inactive Modele ID.");
            if (equipmentDto.IdGroupe.HasValue && !await _context.GroupeEquipements.AnyAsync(g => g.IdGroupe == equipmentDto.IdGroupe.Value && g.IsActif))
                return BadRequest("Invalid or inactive Groupe ID.");

            var equipment = new Equipment
            {
                CodeEquipement = equipmentDto.CodeEquipement,
                Designation = equipmentDto.Designation,
                Description = equipmentDto.Description,
                IdCriticite = equipmentDto.IdCriticite,
                IdEtat = equipmentDto.IdEtat,
                IdFamille = equipmentDto.IdFamille,
                IdModele = equipmentDto.IdModele,
                IdGroupe = equipmentDto.IdGroupe,
                IdChaineProduction = equipmentDto.IdChaineProduction,
                DateInstallation = equipmentDto.DateInstallation,
                DateMiseEnService = equipmentDto.DateMiseEnService,
                NumeroSerie = equipmentDto.NumeroSerie,
                SousGarantie = equipmentDto.SousGarantie,
                DateAchat = equipmentDto.DateAchat,
                DateFinGarantie = equipmentDto.DateFinGarantie,
                DateConstruction = equipmentDto.DateConstruction,
                CoutAchat = equipmentDto.CoutAchat,
                DateCreation = DateTime.Now,
                IsDeleted = false
            };

            _context.Equipments.Add(equipment);
            await _context.SaveChangesAsync();

            // Reload equipment with related data to return full object
            equipment = await _context.Equipments
                .Include(e => e.Criticite)
                .Include(e => e.Etat)
                .Include(e => e.Famille)
                .Include(e => e.Modele).ThenInclude(m => m.Marque)
                .Include(e => e.Groupe)
                .FirstOrDefaultAsync(e => e.IdEquipement == equipment.IdEquipement);

            if (equipment == null)
            {
                return StatusCode(500, "Failed to retrieve the created equipment.");
            }

            return CreatedAtAction(nameof(GetEquipment), new { id = equipment.IdEquipement }, equipment);
        }

        // PUT: api/Equipment/5
        [HttpPut("{id}")]
        public async Task<ActionResult<Equipment>> UpdateEquipment(int id, [FromBody] EquipmentDto equipmentDto)
        {
            if (id != equipmentDto.IdEquipement)
            {
                return BadRequest("ID mismatch.");
            }

            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var existingEquipment = await _context.Equipments
                .FirstOrDefaultAsync(e => e.IdEquipement == id && !e.IsDeleted);

            if (existingEquipment == null)
            {
                return NotFound("Equipment not found or deleted.");
            }

            var ruleError = await ValidateBusinessRulesAsync(equipmentDto);
            if (ruleError != null) return BadRequest(ruleError);

            // Check for unique CodeEquipement if changed (the index covers deleted rows too)
            if (existingEquipment.CodeEquipement != equipmentDto.CodeEquipement)
            {
                if (await _context.Equipments.AnyAsync(e => e.CodeEquipement == equipmentDto.CodeEquipement && e.IdEquipement != id))
                {
                    return BadRequest("Ce code équipement est déjà utilisé (y compris par un équipement supprimé).");
                }
            }

            // Validate foreign keys only if they have values
            if (equipmentDto.IdCriticite.HasValue && !await _context.EquipmentCriticites.AnyAsync(c => c.IdCriticite == equipmentDto.IdCriticite.Value && c.IsActif))
                return BadRequest("Invalid or inactive Criticite ID.");
            if (equipmentDto.IdEtat.HasValue && !await _context.EtatEquipements.AnyAsync(e => e.IdEtat == equipmentDto.IdEtat.Value && e.IsActif))
                return BadRequest("Invalid or inactive Etat ID.");
            if (equipmentDto.IdFamille.HasValue && !await _context.FamilleEquipements.AnyAsync(f => f.IdFamille == equipmentDto.IdFamille.Value && f.IsActif))
                return BadRequest("Invalid or inactive Famille ID.");
            if (equipmentDto.IdModele.HasValue && !await _context.ModeleEquipements.AnyAsync(m => m.IdModele == equipmentDto.IdModele.Value && m.IsActif))
                return BadRequest("Invalid or inactive Modele ID.");
            if (equipmentDto.IdGroupe.HasValue && !await _context.GroupeEquipements.AnyAsync(g => g.IdGroupe == equipmentDto.IdGroupe.Value && g.IsActif))
                return BadRequest("Invalid or inactive Groupe ID.");

            // Update the existing equipment
            existingEquipment.CodeEquipement = equipmentDto.CodeEquipement;
            existingEquipment.Designation = equipmentDto.Designation;
            existingEquipment.Description = equipmentDto.Description;
            existingEquipment.IdCriticite = equipmentDto.IdCriticite;
            existingEquipment.IdEtat = equipmentDto.IdEtat;
            existingEquipment.IdFamille = equipmentDto.IdFamille;
            existingEquipment.IdModele = equipmentDto.IdModele;
            existingEquipment.IdGroupe = equipmentDto.IdGroupe;
            existingEquipment.IdChaineProduction = equipmentDto.IdChaineProduction;
            existingEquipment.DateInstallation = equipmentDto.DateInstallation;
            existingEquipment.DateMiseEnService = equipmentDto.DateMiseEnService;
            existingEquipment.NumeroSerie = equipmentDto.NumeroSerie;
            existingEquipment.SousGarantie = equipmentDto.SousGarantie;
            existingEquipment.DateAchat = equipmentDto.DateAchat;
            existingEquipment.DateFinGarantie = equipmentDto.DateFinGarantie;
            existingEquipment.DateConstruction = equipmentDto.DateConstruction;
            existingEquipment.CoutAchat = equipmentDto.CoutAchat;
            existingEquipment.DateModification = DateTime.Now;

            await _context.SaveChangesAsync();

            // Reload updated equipment with related data
            var updatedEquipment = await _context.Equipments
                .Include(e => e.Criticite)
                .Include(e => e.Etat)
                .Include(e => e.Famille)
                .Include(e => e.Modele).ThenInclude(m => m.Marque)
                .Include(e => e.Groupe)
                .FirstOrDefaultAsync(e => e.IdEquipement == id);

            if (updatedEquipment == null)
            {
                return StatusCode(500, "Failed to retrieve the updated equipment.");
            }

            return Ok(updatedEquipment);
        }

        /// <summary>
        /// Lightweight list for pickers (intervention form): every active machine,
        /// optionally restricted to one production line.
        /// </summary>
        [HttpGet("lookup")]
        public async Task<ActionResult<IEnumerable<object>>> Lookup(int? chaineId = null)
        {
            var query = _context.Equipments.Where(e => !e.IsDeleted);
            if (chaineId.HasValue) query = query.Where(e => e.IdChaineProduction == chaineId || e.IdChaineProduction == null);

            var items = await query
                .OrderBy(e => e.CodeEquipement)
                .Select(e => new { e.IdEquipement, e.CodeEquipement, e.Designation, e.IdChaineProduction })
                .ToListAsync();
            return Ok(items);
        }

        /// <summary>
        /// Maintenance-domain rules for a machine record:
        /// chronology build -> purchase -> installation -> commissioning,
        /// no future dates (except warranty end), warranty after purchase,
        /// non-negative cost, and "under warranty" derived from the warranty end date.
        /// </summary>
        private async Task<string?> ValidateBusinessRulesAsync(EquipmentDto dto)
        {
            dto.CodeEquipement = dto.CodeEquipement?.Trim() ?? string.Empty;
            dto.Designation = dto.Designation?.Trim() ?? string.Empty;
            if (dto.CodeEquipement.Length is 0 or > 50) return "Le code équipement est obligatoire (50 caractères maximum).";
            if (dto.Designation.Length is 0 or > 100) return "La désignation est obligatoire (100 caractères maximum).";
            if (dto.Description?.Length > 255) return "La description ne doit pas dépasser 255 caractères.";
            if (dto.CoutAchat is < 0) return "Le coût d'achat ne peut pas être négatif.";

            var today = DateTime.Today.AddDays(1);
            if (dto.DateConstruction > today || dto.DateAchat > today || dto.DateInstallation > today || dto.DateMiseEnService > today)
                return "Les dates de fabrication, d'achat, d'installation et de mise en service ne peuvent pas être dans le futur.";
            if (dto.DateConstruction.HasValue && dto.DateAchat.HasValue && dto.DateConstruction > dto.DateAchat)
                return "La date de fabrication doit précéder la date d'achat.";
            if (dto.DateAchat.HasValue && dto.DateInstallation.HasValue && dto.DateAchat > dto.DateInstallation)
                return "La date d'installation ne peut pas précéder la date d'achat.";
            if (dto.DateInstallation.HasValue && dto.DateMiseEnService.HasValue && dto.DateInstallation > dto.DateMiseEnService)
                return "La mise en service ne peut pas précéder l'installation.";
            if (dto.DateAchat.HasValue && dto.DateFinGarantie.HasValue && dto.DateFinGarantie < dto.DateAchat)
                return "La fin de garantie doit être postérieure à la date d'achat.";

            // Derived, not declared: a machine is under warranty until its warranty end date
            if (dto.DateFinGarantie.HasValue)
                dto.SousGarantie = dto.DateFinGarantie.Value.Date >= DateTime.Today;

            if (dto.IdChaineProduction.HasValue && !await _context.ChaineProductions.AnyAsync(c => c.IDChaineProduction == dto.IdChaineProduction && c.IsActif))
                return "Chaîne de production invalide.";

            return null;
        }

        // DELETE: api/Equipment/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteEquipment(int id)
        {
            var equipment = await _context.Equipments
                .FirstOrDefaultAsync(e => e.IdEquipement == id && !e.IsDeleted);

            if (equipment == null)
            {
                return NotFound("Equipment not found or already deleted.");
            }

            equipment.IsDeleted = true;
            equipment.DateModification = DateTime.Now;
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // GET: api/Equipment/criticites
        [HttpGet("criticites")]
        public async Task<ActionResult<List<EquipmentCriticite>>> GetCriticites()
        {
            var criticites = await _context.EquipmentCriticites
                .Where(c => c.IsActif)
                .OrderBy(c => c.NomCriticite)
                .ToListAsync();
            return Ok(criticites);
        }

        // GET: api/Equipment/etats
        [HttpGet("etats")]
        public async Task<ActionResult<List<EtatEquipement>>> GetEtats()
        {
            var etats = await _context.EtatEquipements
                .Where(e => e.IsActif)
                .OrderBy(e => e.NomEtat)
                .ToListAsync();
            return Ok(etats);
        }

        // GET: api/Equipment/familles
        [HttpGet("familles")]
        public async Task<ActionResult<List<FamilleEquipment>>> GetFamilles()
        {
            var familles = await _context.FamilleEquipements
                .Where(f => f.IsActif)
                .OrderBy(f => f.NomFamille)
                .ToListAsync();
            return Ok(familles);
        }

        // GET: api/Equipment/groupes
        [HttpGet("groupes")]
        public async Task<ActionResult<List<GroupeEquipement>>> GetGroupes()
        {
            var groupes = await _context.GroupeEquipements
                .Where(g => g.IsActif)
                .OrderBy(g => g.NomGroupe)
                .ToListAsync();
            return Ok(groupes);
        }
    }

    public class pagedResult<T>
    {
        public required List<T> data { get; set; }
        public int totalCount { get; set; }
        public int page { get; set; }
        public int pageSize { get; set; }
    }
}