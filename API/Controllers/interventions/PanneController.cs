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
    }
}