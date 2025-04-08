using Core.Entities;
using Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace API.Controllers
{
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
                .Include(m => m.Marque)
                .Include(m => m.Famille)
                .Include(m => m.Criticite)
                .Where(m => m.IsActif && m.Marque.IsActif && m.Famille.IsActif && m.Criticite.IsActif)
                .ToListAsync());
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<ModeleEquipement>> GetModeleEquipement(int id)
        {
            var modele = await _context.ModeleEquipements
                .Include(m => m.Marque)
                .Include(m => m.Famille)
                .Include(m => m.Criticite)
                .Where(m => m.IdModele == id && m.IsActif && m.Marque.IsActif && m.Famille.IsActif && m.Criticite.IsActif)
                .FirstOrDefaultAsync();
            if (modele == null) return NotFound("Modele not found or inactive.");
            return Ok(modele);
        }
    }
}