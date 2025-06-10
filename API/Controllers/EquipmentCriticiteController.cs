using Core.Entities;
using Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class EquipmentCriticiteController : ControllerBase
    {
        private readonly StoreContext _context;

        public EquipmentCriticiteController(StoreContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<EquipmentCriticite>>> GetEquipmentCriticites()
        {
            return Ok(await _context.EquipmentCriticites.Where(c => c.IsActif).ToListAsync());
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<EquipmentCriticite>> GetEquipmentCriticite(int id)
        {
            var criticite = await _context.EquipmentCriticites
                .Where(c => c.IdCriticite == id && c.IsActif)
                .FirstOrDefaultAsync();
            if (criticite == null) return NotFound("Criticite not found or inactive.");
            return Ok(criticite);
        }

        [HttpPost]
        public async Task<ActionResult<EquipmentCriticite>> CreateEquipmentCriticite([FromBody] EquipmentCriticite equipmentCriticite)
        {
            if (equipmentCriticite == null) return BadRequest("Les données de criticité ne peuvent pas être nulles");
            
            // Vérifier si une criticité avec ce nom existe déjà
            if (await _context.EquipmentCriticites.AnyAsync(c => c.NomCriticite == equipmentCriticite.NomCriticite && c.IsActif))
            {
                return BadRequest("Une criticité avec ce nom existe déjà");
            }

            // S'assurer que IsActif est true pour les nouveaux éléments
            equipmentCriticite.IsActif = true;
            
            _context.EquipmentCriticites.Add(equipmentCriticite);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetEquipmentCriticite), new { id = equipmentCriticite.IdCriticite }, equipmentCriticite);
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<EquipmentCriticite>> UpdateEquipmentCriticite(int id, [FromBody] EquipmentCriticite equipmentCriticite)
        {
            if (equipmentCriticite == null) return BadRequest("Les données de criticité ne peuvent pas être nulles");
            if (id != equipmentCriticite.IdCriticite) return BadRequest("L'ID ne correspond pas");
            
            var existingCriticite = await _context.EquipmentCriticites
                .FirstOrDefaultAsync(c => c.IdCriticite == id && c.IsActif);
                
            if (existingCriticite == null) return NotFound("Criticité introuvable ou inactive");
            
            // Vérifier si la mise à jour créerait un doublon
            if (existingCriticite.NomCriticite != equipmentCriticite.NomCriticite && 
                await _context.EquipmentCriticites.AnyAsync(c => c.NomCriticite == equipmentCriticite.NomCriticite && c.IsActif))
            {
                return BadRequest("Une criticité avec ce nom existe déjà");
            }
            
            // Mettre à jour les propriétés
            existingCriticite.NomCriticite = equipmentCriticite.NomCriticite;
            // Mettre à jour d'autres propriétés si nécessaire
            
            await _context.SaveChangesAsync();
            
            return Ok(existingCriticite);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteEquipmentCriticite(int id)
        {
            var equipmentCriticite = await _context.EquipmentCriticites
                .FirstOrDefaultAsync(c => c.IdCriticite == id && c.IsActif);
                
            if (equipmentCriticite == null) return NotFound("Criticité introuvable ou déjà inactive");
            
            // Suppression logique
            equipmentCriticite.IsActif = false;
            await _context.SaveChangesAsync();
            
            return NoContent();
        }
    }
}