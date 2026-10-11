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
    public class TypeInterventionController : ControllerBase
    {
        private readonly StoreContext _context;

        public TypeInterventionController(StoreContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<TypeIntervention>>> GetTypeInterventions()
        {
            return Ok(await _context.TypeInterventions.Where(t => t.IsActif).ToListAsync());
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<TypeIntervention>> GetTypeIntervention(int id)
        {
            var typeIntervention = await _context.TypeInterventions
                .Where(t => t.IDTypeIntervention == id && t.IsActif)
                .FirstOrDefaultAsync();
            if (typeIntervention == null) return NotFound("TypeIntervention not found or inactive.");
            return Ok(typeIntervention);
        }

        [HttpPost]
        public async Task<ActionResult<TypeIntervention>> CreateTypeIntervention([FromBody] TypeIntervention typeIntervention)
        {
            if (typeIntervention == null) return BadRequest("Les données de type d'intervention ne peuvent pas être nulles");
            
            if (await _context.TypeInterventions.AnyAsync(t => t.Libelle == typeIntervention.Libelle && t.IsActif))
            {
                return BadRequest("Un type d'intervention avec ce nom existe déjà.");
            }

            typeIntervention.IsActif = true;
            
            _context.TypeInterventions.Add(typeIntervention);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetTypeIntervention), new { id = typeIntervention.IDTypeIntervention }, typeIntervention);
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<TypeIntervention>> UpdateTypeIntervention(int id, [FromBody] TypeIntervention typeIntervention)
        {
            if (typeIntervention == null) return BadRequest("Les données de type d'intervention ne peuvent pas être nulles");
            if (id != typeIntervention.IDTypeIntervention) return BadRequest("L'ID ne correspond pas");
            
            var existingType = await _context.TypeInterventions
                .FirstOrDefaultAsync(t => t.IDTypeIntervention == id && t.IsActif);
                
            if (existingType == null) return NotFound("Type d'intervention introuvable ou inactif.");
            
            if (existingType.Libelle != typeIntervention.Libelle && 
                await _context.TypeInterventions.AnyAsync(t => t.Libelle == typeIntervention.Libelle && t.IsActif))
            {
                return BadRequest("Un type d'intervention avec ce nom existe déjà.");
            }
            
            existingType.Libelle = typeIntervention.Libelle;
            await _context.SaveChangesAsync();
            
            return Ok(existingType);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTypeIntervention(int id)
        {
            var typeIntervention = await _context.TypeInterventions
                .FirstOrDefaultAsync(t => t.IDTypeIntervention == id && t.IsActif);
                
            if (typeIntervention == null) return NotFound("Type d'intervention introuvable ou déjà inactif.");
            
            typeIntervention.IsActif = false;
            await _context.SaveChangesAsync();
            
            return NoContent();
        }
    }
}