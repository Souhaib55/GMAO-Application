using API.DTOs;
using Core.Entities;
using Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class EquipmentController : ControllerBase
    {
        private readonly StoreContext _context;

        public EquipmentController(StoreContext context)
        {
            _context = context;
        }

        // GET: api/Equipment
        [HttpGet]
        public async Task<ActionResult<PagedResult<object>>> GetEquipments(int page = 1, int pageSize = 5)
        {
            var query = _context.Equipments
                .Where(e => !e.IsDeleted)
                .Include(e => e.Criticite)
                .Include(e => e.Etat)
                .Include(e => e.Famille)
                .Include(e => e.Modele).ThenInclude(m => m.Marque)
                .Include(e => e.Groupe);

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

            return Ok(new PagedResult<object>
            {
                Data = items.Cast<object>().ToList(),
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize
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
                .FirstOrDefaultAsync(e => e.IdEquipement == id && !e.IsDeleted);

            if (equipment == null)
            {
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

            // Check for unique CodeEquipement
            if (await _context.Equipments.AnyAsync(e => e.CodeEquipement == equipmentDto.CodeEquipement && !e.IsDeleted))
            {
                return BadRequest("An equipment with this CodeEquipement already exists.");
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

            // Check for unique CodeEquipement if changed
            if (existingEquipment.CodeEquipement != equipmentDto.CodeEquipement)
            {
                if (await _context.Equipments.AnyAsync(e => e.CodeEquipement == equipmentDto.CodeEquipement && !e.IsDeleted))
                {
                    return BadRequest("An equipment with this CodeEquipement already exists.");
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

    public class PagedResult<T>
    {
        public required List<T> Data { get; set; }
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
    }
}