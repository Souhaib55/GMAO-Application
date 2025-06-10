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
    public class FamillePieceController : ControllerBase
    {
        private readonly StoreContext _context;

        public FamillePieceController(StoreContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<FamillePiece>>> GetFamillePieces()
        {
            return Ok(await _context.FamillePieces.Where(f => f.IsActif).ToListAsync());
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<FamillePiece>> GetFamillePiece(int id)
        {
            var famille = await _context.FamillePieces
                .Where(f => f.IDFamillePiece == id && f.IsActif)
                .FirstOrDefaultAsync();
            if (famille == null) return NotFound("Famille not found or inactive.");
            return Ok(famille);
        }
        
        [HttpPost]
        public async Task<ActionResult<FamillePiece>> CreateFamillePiece([FromBody] FamillePiece famillePiece)
        {
            if (famillePiece == null) return BadRequest("Les données de famille de pièce ne peuvent pas être nulles");
            
            // Vérifier si une famille avec ce nom existe déjà
            if (await _context.FamillePieces.AnyAsync(f => f.NomFamille == famillePiece.NomFamille && f.IsActif))
            {
                return BadRequest("Une famille de pièce avec ce nom existe déjà");
            }

            // S'assurer que IsActif est true pour les nouveaux éléments
            famillePiece.IsActif = true;
            
            _context.FamillePieces.Add(famillePiece);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetFamillePiece), new { id = famillePiece.IDFamillePiece }, famillePiece);
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<FamillePiece>> UpdateFamillePiece(int id, [FromBody] FamillePiece famillePiece)
        {
            if (famillePiece == null) return BadRequest("Les données de famille de pièce ne peuvent pas être nulles");
            if (id != famillePiece.IDFamillePiece) return BadRequest("L'ID ne correspond pas");
            
            var existingFamille = await _context.FamillePieces
                .FirstOrDefaultAsync(f => f.IDFamillePiece == id && f.IsActif);
                
            if (existingFamille == null) return NotFound("Famille de pièce introuvable ou inactive");
            
            // Vérifier si la mise à jour créerait un doublon
            if (existingFamille.NomFamille != famillePiece.NomFamille && 
                await _context.FamillePieces.AnyAsync(f => f.NomFamille == famillePiece.NomFamille && f.IsActif))
            {
                return BadRequest("Une famille de pièce avec ce nom existe déjà");
            }
            
            // Mettre à jour les propriétés
            existingFamille.NomFamille = famillePiece.NomFamille;
            // Mettre à jour d'autres propriétés si nécessaire
            
            await _context.SaveChangesAsync();
            
            return Ok(existingFamille);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteFamillePiece(int id)
        {
            var famillePiece = await _context.FamillePieces
                .FirstOrDefaultAsync(f => f.IDFamillePiece == id && f.IsActif);
                
            if (famillePiece == null) return NotFound("Famille de pièce introuvable ou déjà inactive");
            
            // Suppression logique
            famillePiece.IsActif = false;
            await _context.SaveChangesAsync();
            
            return NoContent();
        }
    }
}