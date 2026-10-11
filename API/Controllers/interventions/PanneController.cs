using API.Security;
using Core.Entities;
using Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace API.Controllers
{
    [SupervisorWrites]
    [ApiController]
    [Route("api/[controller]")]
    public class PanneController : ControllerBase
    {
        private readonly StoreContext _context;

        public PanneController(StoreContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Panne>>> GetPannes()
        {
            return Ok(await _context.Pannes.Where(p => p.IsActif).ToListAsync());
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Panne>> GetPanne(int id)
        {
            var panne = await _context.Pannes
                .Where(p => p.IDPanne == id && p.IsActif)
                .FirstOrDefaultAsync();
            if (panne == null) return NotFound("Panne not found or inactive.");
            return Ok(panne);
        }

        [HttpPost]
        public async Task<ActionResult<Panne>> CreatePanne([FromBody] Panne panne)
        {
            if (panne == null) return BadRequest("Les données de panne ne peuvent pas être nulles");
            
            if (await _context.Pannes.AnyAsync(p => p.Libelle == panne.Libelle && p.IsActif))
            {
                return BadRequest("Un type de panne avec ce nom existe déjà.");
            }

            panne.IsActif = true;
            
            _context.Pannes.Add(panne);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetPanne), new { id = panne.IDPanne }, panne);
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<Panne>> UpdatePanne(int id, [FromBody] Panne panne)
        {
            if (panne == null) return BadRequest("Les données de panne ne peuvent pas être nulles");
            if (id != panne.IDPanne) return BadRequest("L'ID ne correspond pas");
            
            var existingPanne = await _context.Pannes
                .FirstOrDefaultAsync(p => p.IDPanne == id && p.IsActif);
                
            if (existingPanne == null) return NotFound("Type de panne introuvable ou inactif.");
            
            if (existingPanne.Libelle != panne.Libelle && 
                await _context.Pannes.AnyAsync(p => p.Libelle == panne.Libelle && p.IsActif))
            {
                return BadRequest("Un type de panne avec ce nom existe déjà.");
            }
            
            existingPanne.Libelle = panne.Libelle;
            await _context.SaveChangesAsync();
            
            return Ok(existingPanne);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeletePanne(int id)
        {
            var panne = await _context.Pannes
                .FirstOrDefaultAsync(p => p.IDPanne == id && p.IsActif);
                
            if (panne == null) return NotFound("Type de panne introuvable ou déjà inactif.");
            
            panne.IsActif = false;
            await _context.SaveChangesAsync();
            
            return NoContent();
        }
    }
}