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
    public class ChaineProductionController : ControllerBase
    {
        private readonly StoreContext _context;

        public ChaineProductionController(StoreContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<ChaineProduction>>> GetChaineProductions()
        {
            return Ok(await _context.ChaineProductions.Where(c => c.IsActif).ToListAsync());
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<ChaineProduction>> GetChaineProduction(int id)
        {
            var chaineProduction = await _context.ChaineProductions
                .Where(c => c.IDChaineProduction == id && c.IsActif)
                .FirstOrDefaultAsync();
            if (chaineProduction == null) return NotFound("ChaineProduction not found or inactive.");
            return Ok(chaineProduction);
        }

        [HttpPost]
        public async Task<ActionResult<ChaineProduction>> CreateChaineProduction([FromBody] ChaineProduction chaineProduction)
        {
            if (chaineProduction == null) return BadRequest("Les données de chaîne de production ne peuvent pas être nulles");
            
            if (await _context.ChaineProductions.AnyAsync(c => c.Libelle == chaineProduction.Libelle && c.IsActif))
            {
                return BadRequest("Une chaîne de production avec ce nom existe déjà.");
            }

            chaineProduction.IsActif = true;
            
            _context.ChaineProductions.Add(chaineProduction);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetChaineProduction), new { id = chaineProduction.IDChaineProduction }, chaineProduction);
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<ChaineProduction>> UpdateChaineProduction(int id, [FromBody] ChaineProduction chaineProduction)
        {
            if (chaineProduction == null) return BadRequest("Les données de chaîne de production ne peuvent pas être nulles");
            if (id != chaineProduction.IDChaineProduction) return BadRequest("L'ID ne correspond pas");
            
            var existingChaine = await _context.ChaineProductions
                .FirstOrDefaultAsync(c => c.IDChaineProduction == id && c.IsActif);
                
            if (existingChaine == null) return NotFound("Chaîne de production introuvable ou inactive.");
            
            if (existingChaine.Libelle != chaineProduction.Libelle && 
                await _context.ChaineProductions.AnyAsync(c => c.Libelle == chaineProduction.Libelle && c.IsActif))
            {
                return BadRequest("Une chaîne de production avec ce nom existe déjà.");
            }
            
            existingChaine.Libelle = chaineProduction.Libelle;
            await _context.SaveChangesAsync();
            
            return Ok(existingChaine);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteChaineProduction(int id)
        {
            var chaineProduction = await _context.ChaineProductions
                .FirstOrDefaultAsync(c => c.IDChaineProduction == id && c.IsActif);
                
            if (chaineProduction == null) return NotFound("Chaîne de production introuvable ou déjà inactive.");
            
            chaineProduction.IsActif = false;
            await _context.SaveChangesAsync();
            
            return NoContent();
        }
    }
}