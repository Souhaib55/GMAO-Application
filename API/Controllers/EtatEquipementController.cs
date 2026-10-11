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
    public class EtatEquipementController : ControllerBase
    {
        private readonly StoreContext _context;

        public EtatEquipementController(StoreContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<EtatEquipement>>> GetEtatEquipements()
        {
            return Ok(await _context.EtatEquipements.Where(e => e.IsActif).ToListAsync());
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<EtatEquipement>> GetEtatEquipement(int id)
        {
            var etat = await _context.EtatEquipements
                .Where(e => e.IdEtat == id && e.IsActif)
                .FirstOrDefaultAsync();
            if (etat == null) return NotFound("Etat not found or inactive.");
            return Ok(etat);
        }

        [HttpPost]
        public async Task<ActionResult<EtatEquipement>> CreateEtatEquipement([FromBody] EtatEquipement etatEquipement)
        {
            if (etatEquipement == null) return BadRequest("Les données d'état d'équipement ne peuvent pas être nulles");
            
            // Vérifier si un état avec ce nom existe déjà
            if (await _context.EtatEquipements.AnyAsync(e => e.NomEtat == etatEquipement.NomEtat && e.IsActif))
            {
                return BadRequest("Un état d'équipement avec ce nom existe déjà");
            }

            // S'assurer que IsActif est true pour les nouveaux éléments
            etatEquipement.IsActif = true;
            
            _context.EtatEquipements.Add(etatEquipement);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetEtatEquipement), new { id = etatEquipement.IdEtat }, etatEquipement);
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<EtatEquipement>> UpdateEtatEquipement(int id, [FromBody] EtatEquipement etatEquipement)
        {
            if (etatEquipement == null) return BadRequest("Les données d'état d'équipement ne peuvent pas être nulles");
            if (id != etatEquipement.IdEtat) return BadRequest("L'ID ne correspond pas");
            
            var existingEtat = await _context.EtatEquipements
                .FirstOrDefaultAsync(e => e.IdEtat == id && e.IsActif);
                
            if (existingEtat == null) return NotFound("État d'équipement introuvable ou inactif");
            
            // Vérifier si la mise à jour créerait un doublon
            if (existingEtat.NomEtat != etatEquipement.NomEtat && 
                await _context.EtatEquipements.AnyAsync(e => e.NomEtat == etatEquipement.NomEtat && e.IsActif))
            {
                return BadRequest("Un état d'équipement avec ce nom existe déjà");
            }
            
            // Mettre à jour les propriétés
            existingEtat.NomEtat = etatEquipement.NomEtat;
            // Mettre à jour d'autres propriétés si nécessaire
            
            await _context.SaveChangesAsync();
            
            return Ok(existingEtat);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteEtatEquipement(int id)
        {
            var etatEquipement = await _context.EtatEquipements
                .FirstOrDefaultAsync(e => e.IdEtat == id && e.IsActif);
                
            if (etatEquipement == null) return NotFound("État d'équipement introuvable ou déjà inactif");
            
            // Suppression logique
            etatEquipement.IsActif = false;
            await _context.SaveChangesAsync();
            
            return NoContent();
        }
    }
}