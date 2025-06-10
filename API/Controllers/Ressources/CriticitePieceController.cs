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
    public class CriticitePieceController : ControllerBase
    {
        private readonly StoreContext _context;

        public CriticitePieceController(StoreContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<CriticitePiece>>> GetCriticitePieces()
        {
            return Ok(await _context.CriticitePieces.Where(c => c.IsActif).ToListAsync());
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<CriticitePiece>> GetCriticitePiece(int id)
        {
            var criticite = await _context.CriticitePieces
                .Where(c => c.IDCriticitePiece == id && c.IsActif)
                .FirstOrDefaultAsync();
            if (criticite == null) return NotFound("Criticite not found or inactive.");
            return Ok(criticite);
        }
        
        [HttpPost]
        public async Task<ActionResult<CriticitePiece>> CreateCriticitePiece([FromBody] CriticitePiece criticitePiece)
        {
            if (criticitePiece == null) return BadRequest("Les données de criticité ne peuvent pas être nulles");
            
            // Vérifier si une criticité avec ce nom existe déjà
            if (await _context.CriticitePieces.AnyAsync(c => c.NiveauCriticitePiece == criticitePiece.NiveauCriticitePiece && c.IsActif))
            {
                return BadRequest("Une criticité avec ce niveau existe déjà");
            }

            // S'assurer que IsActif est true pour les nouveaux éléments
            criticitePiece.IsActif = true;
            
            _context.CriticitePieces.Add(criticitePiece);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetCriticitePiece), new { id = criticitePiece.IDCriticitePiece }, criticitePiece);
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<CriticitePiece>> UpdateCriticitePiece(int id, [FromBody] CriticitePiece criticitePiece)
        {
            if (criticitePiece == null) return BadRequest("Les données de criticité ne peuvent pas être nulles");
            if (id != criticitePiece.IDCriticitePiece) return BadRequest("L'ID ne correspond pas");
            
            var existingCriticitePiece = await _context.CriticitePieces
                .FirstOrDefaultAsync(c => c.IDCriticitePiece == id && c.IsActif);
                
            if (existingCriticitePiece == null) return NotFound("Criticité introuvable ou inactive");
            
            // Vérifier si la mise à jour créerait un doublon
            if (existingCriticitePiece.NiveauCriticitePiece != criticitePiece.NiveauCriticitePiece && 
                await _context.CriticitePieces.AnyAsync(c => c.NiveauCriticitePiece == criticitePiece.NiveauCriticitePiece && c.IsActif))
            {
                return BadRequest("Une criticité avec ce niveau existe déjà");
            }
            
            // Mettre à jour les propriétés
            existingCriticitePiece.NiveauCriticitePiece = criticitePiece.NiveauCriticitePiece;
            // Mettre à jour d'autres propriétés si nécessaire
            
            await _context.SaveChangesAsync();
            
            return Ok(existingCriticitePiece);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteCriticitePiece(int id)
        {
            var criticitePiece = await _context.CriticitePieces
                .FirstOrDefaultAsync(c => c.IDCriticitePiece == id && c.IsActif);
                
            if (criticitePiece == null) return NotFound("Criticité introuvable ou déjà inactive");
            
            // Suppression logique
            criticitePiece.IsActif = false;
            await _context.SaveChangesAsync();
            
            return NoContent();
        }
    }
}