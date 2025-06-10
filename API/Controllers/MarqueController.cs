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
    public class MarqueController : ControllerBase
    {
        private readonly StoreContext _context;

        public MarqueController(StoreContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Marque>>> GetMarques()
        {
            return Ok(await _context.Marques.Where(m => m.IsActif).ToListAsync());
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Marque>> GetMarque(int id)
        {
            var marque = await _context.Marques
                .Where(m => m.IdMarque == id && m.IsActif)
                .FirstOrDefaultAsync();
            if (marque == null) return NotFound("Marque not found or inactive.");
            return Ok(marque);
        }
        
        [HttpPost]
        public async Task<ActionResult<Marque>> CreateMarque([FromBody] Marque marque)
        {
            if (marque == null) return BadRequest("Les données de marque ne peuvent pas être nulles");
            
            // Vérifier si une marque avec ce nom existe déjà
            if (await _context.Marques.AnyAsync(m => m.NomMarque == marque.NomMarque && m.IsActif))
            {
                return BadRequest("Une marque avec ce nom existe déjà");
            }

            // S'assurer que IsActif est true pour les nouveaux éléments
            marque.IsActif = true;
            
            _context.Marques.Add(marque);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetMarque), new { id = marque.IdMarque }, marque);
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<Marque>> UpdateMarque(int id, [FromBody] Marque marque)
        {
            if (marque == null) return BadRequest("Les données de marque ne peuvent pas être nulles");
            if (id != marque.IdMarque) return BadRequest("L'ID ne correspond pas");
            
            var existingMarque = await _context.Marques
                .FirstOrDefaultAsync(m => m.IdMarque == id && m.IsActif);
                
            if (existingMarque == null) return NotFound("Marque introuvable ou inactive");
            
            // Vérifier si la mise à jour créerait un doublon
            if (existingMarque.NomMarque != marque.NomMarque && 
                await _context.Marques.AnyAsync(m => m.NomMarque == marque.NomMarque && m.IsActif))
            {
                return BadRequest("Une marque avec ce nom existe déjà");
            }
            
            // Mettre à jour les propriétés
            existingMarque.NomMarque = marque.NomMarque;
            // Mettre à jour d'autres propriétés si nécessaire
            
            await _context.SaveChangesAsync();
            
            return Ok(existingMarque);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteMarque(int id)
        {
            var marque = await _context.Marques
                .FirstOrDefaultAsync(m => m.IdMarque == id && m.IsActif);
                
            if (marque == null) return NotFound("Marque introuvable ou déjà inactive");
            
            // Suppression logique
            marque.IsActif = false;
            await _context.SaveChangesAsync();
            
            return NoContent();
        }
    }
}