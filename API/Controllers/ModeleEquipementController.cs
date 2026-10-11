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
    public class ModeleEquipementController : ControllerBase
    {
        private readonly StoreContext _context;

        public ModeleEquipementController(StoreContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<ModeleEquipement>>> GetModeleEquipements()
        {
            return Ok(await _context.ModeleEquipements
                .Where(m => m.IsActif)
                .ToListAsync());
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<ModeleEquipement>> GetModeleEquipement(int id)
        {
            var modele = await _context.ModeleEquipements
                .FirstOrDefaultAsync(m => m.IdModele == id && m.IsActif);
            if (modele == null) return NotFound("Modele not found or inactive.");
            return Ok(modele);
        }

        [HttpPost]
        public async Task<ActionResult<ModeleEquipement>> CreateModeleEquipement([FromBody] ModeleEquipement modele)
        {
            if (modele == null) return BadRequest("Les données du modèle ne peuvent pas être nulles");
            
            if (string.IsNullOrWhiteSpace(modele.NomModele))
            {
                return BadRequest("Le nom du modèle est requis.");
            }
            
            if (await _context.ModeleEquipements.AnyAsync(m => m.NomModele == modele.NomModele && m.IsActif))
            {
                return BadRequest("Un modèle d'équipement avec ce nom existe déjà.");
            }

            modele.IsActif = true;
            modele.DateCreation = DateTime.Now;
            modele.DateModification = null;
            
            _context.ModeleEquipements.Add(modele);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetModeleEquipement), new { id = modele.IdModele }, modele);
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<ModeleEquipement>> UpdateModeleEquipement(int id, [FromBody] ModeleEquipement modele)
        {
            if (modele == null) return BadRequest("Les données du modèle ne peuvent pas être nulles");
            if (id != modele.IdModele) return BadRequest("L'ID ne correspond pas");
            
            var existingModele = await _context.ModeleEquipements
                .FirstOrDefaultAsync(m => m.IdModele == id && m.IsActif);
                
            if (existingModele == null) return NotFound("Modèle d'équipement introuvable ou inactif.");
            
            // Vérifier si le nom existe déjà pour un autre modèle
            if (existingModele.NomModele != modele.NomModele && 
                await _context.ModeleEquipements.AnyAsync(m => m.NomModele == modele.NomModele && m.IdModele != id && m.IsActif))
            {
                return BadRequest("Un modèle d'équipement avec ce nom existe déjà.");
            }
            
            existingModele.NomModele = modele.NomModele;
            existingModele.DateModification = DateTime.Now;
            
            await _context.SaveChangesAsync();
            
            return Ok(existingModele);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteModeleEquipement(int id)
        {
            var modele = await _context.ModeleEquipements
                .FirstOrDefaultAsync(m => m.IdModele == id && m.IsActif);
                
            if (modele == null) return NotFound("Modèle d'équipement introuvable ou déjà inactif.");
            
            modele.IsActif = false;
            modele.DateModification = DateTime.Now;
            await _context.SaveChangesAsync();
            
            return NoContent();
        }
    }
}