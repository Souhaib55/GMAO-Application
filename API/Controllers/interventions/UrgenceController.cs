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
    }
}