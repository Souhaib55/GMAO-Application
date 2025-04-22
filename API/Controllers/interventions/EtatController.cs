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
    public class EtatController : ControllerBase
    {
        private readonly StoreContext _context;

        public EtatController(StoreContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Etat>>> GetEtats()
        {
            return Ok(await _context.Etats.Where(e => e.IsActif).ToListAsync());
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Etat>> GetEtat(int id)
        {
            var etat = await _context.Etats
                .Where(e => e.IDEtat == id && e.IsActif)
                .FirstOrDefaultAsync();
            if (etat == null) return NotFound("Etat not found or inactive.");
            return Ok(etat);
        }
    }
}