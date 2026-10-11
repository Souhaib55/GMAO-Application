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
    public class ConstructeurController : ControllerBase
    {
        private readonly StoreContext _context;

        public ConstructeurController(StoreContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Constructeur>>> GetConstructeurs()
        {
            return Ok(await _context.Constructeurs.Where(c => c.IsActif).ToListAsync());
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Constructeur>> GetConstructeur(int id)
        {
            var constructeur = await _context.Constructeurs
                .Where(c => c.IDConstructeur == id && c.IsActif)
                .FirstOrDefaultAsync();
            if (constructeur == null) return NotFound("Constructeur not found or inactive.");
            return Ok(constructeur);
        }

        [HttpPost]
        public async Task<ActionResult<Constructeur>> CreateConstructeur([FromBody] Constructeur constructeur)
        {
            if (constructeur == null) return BadRequest("Les données du constructeur ne peuvent pas être nulles");
            
            // Vérifier si un constructeur avec ce nom existe déjà
            if (await _context.Constructeurs.AnyAsync(c => c.NomConstructeur == constructeur.NomConstructeur && c.IsActif))
            {
                return BadRequest("Un constructeur avec ce nom existe déjà");
            }

            // S'assurer que IsActif est true pour les nouveaux éléments
            constructeur.IsActif = true;
            
            _context.Constructeurs.Add(constructeur);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetConstructeur), new { id = constructeur.IDConstructeur }, constructeur);
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<Constructeur>> UpdateConstructeur(int id, [FromBody] Constructeur constructeur)
        {
            if (constructeur == null) return BadRequest("Les données du constructeur ne peuvent pas être nulles");
            if (id != constructeur.IDConstructeur) return BadRequest("L'ID ne correspond pas");
            
            var existingConstructeur = await _context.Constructeurs
                .FirstOrDefaultAsync(c => c.IDConstructeur == id && c.IsActif);
                
            if (existingConstructeur == null) return NotFound("Constructeur introuvable ou inactif");
            
            // Vérifier si la mise à jour créerait un doublon
            if (existingConstructeur.NomConstructeur != constructeur.NomConstructeur && 
                await _context.Constructeurs.AnyAsync(c => c.NomConstructeur == constructeur.NomConstructeur && c.IsActif))
            {
                return BadRequest("Un constructeur avec ce nom existe déjà");
            }
            
            // Mettre à jour les propriétés
            existingConstructeur.NomConstructeur = constructeur.NomConstructeur;
            // Mettre à jour d'autres propriétés si nécessaire
            
            await _context.SaveChangesAsync();
            
            return Ok(existingConstructeur);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteConstructeur(int id)
        {
            var constructeur = await _context.Constructeurs
                .FirstOrDefaultAsync(c => c.IDConstructeur == id && c.IsActif);
                
            if (constructeur == null) return NotFound("Constructeur introuvable ou déjà inactif");
            
            // Suppression logique
            constructeur.IsActif = false;
            await _context.SaveChangesAsync();
            
            return NoContent();
        }
    }
}