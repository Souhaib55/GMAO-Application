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
    public class EtatController : ControllerBase
    {
        private readonly StoreContext _context;

        public EtatController(StoreContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Etat>>> GetEtats()
        {
            return Ok(await _context.Etats.Where(e => e.IsActif).ToListAsync());
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Etat>> GetEtat(int id)
        {
            var etat = await _context.Etats
                .Where(e => e.IDEtat == id && e.IsActif)
                .FirstOrDefaultAsync();
            if (etat == null) return NotFound("Etat not found or inactive.");
            return Ok(etat);
        }

        [HttpPost]
        public async Task<ActionResult<Etat>> CreateEtat([FromBody] Etat etat)
        {
            if (etat == null) return BadRequest("Les données d'état ne peuvent pas être nulles");
            
            if (await _context.Etats.AnyAsync(e => e.Libelle == etat.Libelle && e.IsActif))
            {
                return BadRequest("Un état avec ce nom existe déjà.");
            }

            etat.IsActif = true;
            
            _context.Etats.Add(etat);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetEtat), new { id = etat.IDEtat }, etat);
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<Etat>> UpdateEtat(int id, [FromBody] Etat etat)
        {
            if (etat == null) return BadRequest("Les données d'état ne peuvent pas être nulles");
            if (id != etat.IDEtat) return BadRequest("L'ID ne correspond pas");
            
            var existingEtat = await _context.Etats
                .FirstOrDefaultAsync(e => e.IDEtat == id && e.IsActif);
                
            if (existingEtat == null) return NotFound("État introuvable ou inactif.");
            
            if (existingEtat.Libelle != etat.Libelle && 
                await _context.Etats.AnyAsync(e => e.Libelle == etat.Libelle && e.IsActif))
            {
                return BadRequest("Un état avec ce nom existe déjà.");
            }
            
            existingEtat.Libelle = etat.Libelle;
            await _context.SaveChangesAsync();
            
            return Ok(existingEtat);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteEtat(int id)
        {
            var etat = await _context.Etats
                .FirstOrDefaultAsync(e => e.IDEtat == id && e.IsActif);
                
            if (etat == null) return NotFound("État introuvable ou déjà inactif.");
            
            etat.IsActif = false;
            await _context.SaveChangesAsync();
            
            return NoContent();
        }
    }
}