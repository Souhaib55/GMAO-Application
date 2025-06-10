using API.DTOs;
using Core.Entities;
using Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace API.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class StatusController : ControllerBase
    {
        private readonly StoreContext _context;

        public StatusController(StoreContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<StatusDto>>> GetAllStatus()
        {
            var statuses = await _context.Statuses
                .Where(s => s.IsActif)
                .Select(s => new StatusDto
                {
                    Id = s.Id,
                    Statut = s.Statut,
                    Description = s.Description,
                    IsActif = s.IsActif
                })
                .ToListAsync();

            return Ok(statuses);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<StatusDto>> GetStatus(int id)
        {
            var status = await _context.Statuses.FindAsync(id);

            if (status == null || !status.IsActif)
            {
                return NotFound();
            }

            var statusDto = new StatusDto
            {
                Id = status.Id,
                Statut = status.Statut,
                Description = status.Description,
                IsActif = status.IsActif
            };

            return Ok(statusDto);
        }
        
        [HttpPost]
        public async Task<ActionResult<StatusDto>> CreateStatus([FromBody] StatusDto statusDto)
        {
            if (statusDto == null)
                return BadRequest("Les données de statut ne peuvent pas être nulles");

            if (string.IsNullOrWhiteSpace(statusDto.Statut))
                return BadRequest("Le statut est requis");

            // Vérifier si un statut similaire existe déjà
            if (await _context.Statuses.AnyAsync(s => s.Statut == statusDto.Statut && s.IsActif))
                return BadRequest("Un statut avec ce nom existe déjà");

            // Création de l'entité
            var status = new Status
            {
                Statut = statusDto.Statut,
                Description = statusDto.Description,
                IsActif = true
            };

            _context.Statuses.Add(status);
            await _context.SaveChangesAsync();

            // Retourner le DTO avec l'ID généré
            statusDto.Id = status.Id;
            statusDto.IsActif = status.IsActif;

            return CreatedAtAction(nameof(GetStatus), new { id = status.Id }, statusDto);
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<StatusDto>> UpdateStatus(int id, [FromBody] StatusDto statusDto)
        {
            if (statusDto == null)
                return BadRequest("Les données de statut ne peuvent pas être nulles");

            if (string.IsNullOrWhiteSpace(statusDto.Statut))
                return BadRequest("Le statut est requis");

            if (id != statusDto.Id)
                return BadRequest("L'ID ne correspond pas");

            var status = await _context.Statuses
                .FirstOrDefaultAsync(s => s.Id == id && s.IsActif);

            if (status == null)
                return NotFound("Statut introuvable ou inactif");

            // Vérifier si la mise à jour créerait un doublon
            if (status.Statut != statusDto.Statut &&
                await _context.Statuses.AnyAsync(s => s.Statut == statusDto.Statut && s.IsActif && s.Id != id))
                return BadRequest("Un statut avec ce nom existe déjà");

            // Mise à jour des propriétés
            status.Statut = statusDto.Statut;
            status.Description = statusDto.Description;

            await _context.SaveChangesAsync();

            // Retourner le DTO mis à jour
            var updatedStatusDto = new StatusDto
            {
                Id = status.Id,
                Statut = status.Statut,
                Description = status.Description,
                IsActif = status.IsActif
            };

            return Ok(updatedStatusDto);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteStatus(int id)
        {
            var status = await _context.Statuses
                .FirstOrDefaultAsync(s => s.Id == id && s.IsActif);

            if (status == null)
                return NotFound("Statut introuvable ou déjà inactif");

            // Suppression logique
            status.IsActif = false;
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}