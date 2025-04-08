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
    }
}