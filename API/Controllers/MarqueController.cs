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
    public class MarqueController : ControllerBase
    {
        private readonly StoreContext _context;

        public MarqueController(StoreContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Marque>>> GetMarques()
        {
            return Ok(await _context.Marques.Where(m => m.IsActif).ToListAsync());
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Marque>> GetMarque(int id)
        {
            var marque = await _context.Marques
                .Where(m => m.IdMarque == id && m.IsActif)
                .FirstOrDefaultAsync();
            if (marque == null) return NotFound("Marque not found or inactive.");
            return Ok(marque);
        }
    }
}