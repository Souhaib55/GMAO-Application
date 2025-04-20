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
    public class ConstructeurController : ControllerBase
    {
        private readonly StoreContext _context;

        public ConstructeurController(StoreContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Constructeur>>> GetConstructeurs()
        {
            return Ok(await _context.Constructeurs.Where(c => c.IsActif).ToListAsync());
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Constructeur>> GetConstructeur(int id)
        {
            var constructeur = await _context.Constructeurs
                .Where(c => c.IDConstructeur == id && c.IsActif)
                .FirstOrDefaultAsync();
            if (constructeur == null) return NotFound("Constructeur not found or inactive.");
            return Ok(constructeur);
        }
    }
}