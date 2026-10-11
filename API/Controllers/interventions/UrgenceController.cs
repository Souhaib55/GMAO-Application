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
    public class UrgenceController : ControllerBase
    {
        private readonly StoreContext _context;

        public UrgenceController(StoreContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Urgence>>> GetUrgences()
        {
            return Ok(await _context.Urgences.Where(u => u.IsActif).ToListAsync());
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Urgence>> GetUrgence(int id)
        {
            var urgence = await _context.Urgences
                .Where(u => u.IDUrgence == id && u.IsActif)
                .FirstOrDefaultAsync();
            if (urgence == null) return NotFound("Urgence not found or inactive.");
            return Ok(urgence);
        }

        // Nouvelle méthode POST pour créer une urgence
        [HttpPost]
        public async Task<ActionResult<Urgence>> CreateUrgence([FromBody] Urgence urgence)
        {
            if (urgence == null) return BadRequest("Les données d'urgence ne peuvent pas être nulles");
            
            // Vérifier si une urgence similaire existe déjà
            if (await _context.Urgences.AnyAsync(u => u.Libelle == urgence.Libelle && u.IsActif))
            {
                return BadRequest("Une urgence avec ce nom existe déjà.");
            }

            // Assurer que IsActif est défini à true pour les nouveaux éléments
            urgence.IsActif = true;
            
            _context.Urgences.Add(urgence);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetUrgence), new { id = urgence.IDUrgence }, urgence);
        }

        // Nouvelle méthode PUT pour mettre à jour une urgence
        [HttpPut("{id}")]
        public async Task<ActionResult<Urgence>> UpdateUrgence(int id, [FromBody] Urgence urgence)
        {
            if (urgence == null) return BadRequest("Les données d'urgence ne peuvent pas être nulles");
            if (id != urgence.IDUrgence) return BadRequest("L'ID ne correspond pas");
            
            var existingUrgence = await _context.Urgences
                .FirstOrDefaultAsync(u => u.IDUrgence == id && u.IsActif);
                
            if (existingUrgence == null) return NotFound("Urgence introuvable ou inactive.");
            
            // Vérifier si la mise à jour créerait un doublon
            if (existingUrgence.Libelle != urgence.Libelle && 
                await _context.Urgences.AnyAsync(u => u.Libelle == urgence.Libelle && u.IsActif))
            {
                return BadRequest("Une urgence avec ce nom existe déjà.");
            }
            
            // Mettre à jour les propriétés
            existingUrgence.Libelle = urgence.Libelle;
            // Toute autre propriété qui doit être mise à jour
            
            await _context.SaveChangesAsync();
            
            return Ok(existingUrgence);
        }

        // Nouvelle méthode DELETE pour supprimer une urgence
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteUrgence(int id)
        {
            var urgence = await _context.Urgences
                .FirstOrDefaultAsync(u => u.IDUrgence == id && u.IsActif);
                
            if (urgence == null) return NotFound("Urgence introuvable ou déjà inactive.");
            
            // Suppression logique
            urgence.IsActif = false;
            await _context.SaveChangesAsync();
            
            return NoContent();
        }
    }
}