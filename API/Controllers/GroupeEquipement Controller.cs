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
    public class GroupeEquipementController : ControllerBase
    {
        private readonly StoreContext _context;

        public GroupeEquipementController(StoreContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<GroupeEquipement>>> GetGroupeEquipements()
        {
            return Ok(await _context.GroupeEquipements.Where(g => g.IsActif).ToListAsync());
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<GroupeEquipement>> GetGroupeEquipement(int id)
        {
            var groupe = await _context.GroupeEquipements
                .Where(g => g.IdGroupe == id && g.IsActif)
                .FirstOrDefaultAsync();
            if (groupe == null) return NotFound("Groupe not found or inactive.");
            return Ok(groupe);
        }
        
        [HttpPost]
        public async Task<ActionResult<GroupeEquipement>> CreateGroupeEquipement([FromBody] GroupeEquipement groupeEquipement)
        {
            if (groupeEquipement == null) return BadRequest("Les données de groupe d'équipement ne peuvent pas être nulles");
            
            // Vérifier si un groupe avec ce nom existe déjà
            if (await _context.GroupeEquipements.AnyAsync(g => g.NomGroupe == groupeEquipement.NomGroupe && g.IsActif))
            {
                return BadRequest("Un groupe d'équipement avec ce nom existe déjà");
            }

            // S'assurer que IsActif est true pour les nouveaux éléments
            groupeEquipement.IsActif = true;
            
            _context.GroupeEquipements.Add(groupeEquipement);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetGroupeEquipement), new { id = groupeEquipement.IdGroupe }, groupeEquipement);
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<GroupeEquipement>> UpdateGroupeEquipement(int id, [FromBody] GroupeEquipement groupeEquipement)
        {
            if (groupeEquipement == null) return BadRequest("Les données de groupe d'équipement ne peuvent pas être nulles");
            if (id != groupeEquipement.IdGroupe) return BadRequest("L'ID ne correspond pas");
            
            var existingGroupe = await _context.GroupeEquipements
                .FirstOrDefaultAsync(g => g.IdGroupe == id && g.IsActif);
                
            if (existingGroupe == null) return NotFound("Groupe d'équipement introuvable ou inactif");
            
            // Vérifier si la mise à jour créerait un doublon
            if (existingGroupe.NomGroupe != groupeEquipement.NomGroupe && 
                await _context.GroupeEquipements.AnyAsync(g => g.NomGroupe == groupeEquipement.NomGroupe && g.IsActif))
            {
                return BadRequest("Un groupe d'équipement avec ce nom existe déjà");
            }
            
            // Mettre à jour les propriétés
            existingGroupe.NomGroupe = groupeEquipement.NomGroupe;
            // Mettre à jour d'autres propriétés si nécessaire
            
            await _context.SaveChangesAsync();
            
            return Ok(existingGroupe);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteGroupeEquipement(int id)
        {
            var groupeEquipement = await _context.GroupeEquipements
                .FirstOrDefaultAsync(g => g.IdGroupe == id && g.IsActif);
                
            if (groupeEquipement == null) return NotFound("Groupe d'équipement introuvable ou déjà inactif");
            
            // Suppression logique
            groupeEquipement.IsActif = false;
            await _context.SaveChangesAsync();
            
            return NoContent();
        }
    }
}