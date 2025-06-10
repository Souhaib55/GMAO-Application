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
    public class FamilleEquipmentController : ControllerBase
    {
        private readonly StoreContext _context;

        public FamilleEquipmentController(StoreContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<FamilleEquipment>>> GetFamilleEquipments()
        {
            return Ok(await _context.FamilleEquipements.Where(f => f.IsActif).ToListAsync());
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<FamilleEquipment>> GetFamilleEquipment(int id)
        {
            var famille = await _context.FamilleEquipements
                .Where(f => f.IdFamille == id && f.IsActif)
                .FirstOrDefaultAsync();
            if (famille == null) return NotFound("Famille not found or inactive.");
            return Ok(famille);
        }

        [HttpPost]
        public async Task<ActionResult<FamilleEquipment>> CreateFamilleEquipment([FromBody] FamilleEquipment familleEquipment)
        {
            if (familleEquipment == null) return BadRequest("Les données de famille d'équipement ne peuvent pas être nulles");
            
            // Vérifier si une famille avec ce nom existe déjà
            if (await _context.FamilleEquipements.AnyAsync(f => f.NomFamille == familleEquipment.NomFamille && f.IsActif))
            {
                return BadRequest("Une famille d'équipement avec ce nom existe déjà");
            }

            // S'assurer que IsActif est true pour les nouveaux éléments
            familleEquipment.IsActif = true;
            
            _context.FamilleEquipements.Add(familleEquipment);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetFamilleEquipment), new { id = familleEquipment.IdFamille }, familleEquipment);
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<FamilleEquipment>> UpdateFamilleEquipment(int id, [FromBody] FamilleEquipment familleEquipment)
        {
            if (familleEquipment == null) return BadRequest("Les données de famille d'équipement ne peuvent pas être nulles");
            if (id != familleEquipment.IdFamille) return BadRequest("L'ID ne correspond pas");
            
            var existingFamille = await _context.FamilleEquipements
                .FirstOrDefaultAsync(f => f.IdFamille == id && f.IsActif);
                
            if (existingFamille == null) return NotFound("Famille d'équipement introuvable ou inactive");
            
            // Vérifier si la mise à jour créerait un doublon
            if (existingFamille.NomFamille != familleEquipment.NomFamille && 
                await _context.FamilleEquipements.AnyAsync(f => f.NomFamille == familleEquipment.NomFamille && f.IsActif))
            {
                return BadRequest("Une famille d'équipement avec ce nom existe déjà");
            }
            
            // Mettre à jour les propriétés
            existingFamille.NomFamille = familleEquipment.NomFamille;
            // Mettre à jour d'autres propriétés si nécessaire
            
            await _context.SaveChangesAsync();
            
            return Ok(existingFamille);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteFamilleEquipment(int id)
        {
            var familleEquipment = await _context.FamilleEquipements
                .FirstOrDefaultAsync(f => f.IdFamille == id && f.IsActif);
                
            if (familleEquipment == null) return NotFound("Famille d'équipement introuvable ou déjà inactive");
            
            // Suppression logique
            familleEquipment.IsActif = false;
            await _context.SaveChangesAsync();
            
            return NoContent();
        }
    }
}