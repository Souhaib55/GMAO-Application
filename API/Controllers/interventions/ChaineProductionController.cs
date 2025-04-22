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
    public class ChaineProductionController : ControllerBase
    {
        private readonly StoreContext _context;

        public ChaineProductionController(StoreContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<ChaineProduction>>> GetChaineProductions()
        {
            return Ok(await _context.ChaineProductions.Where(c => c.IsActif).ToListAsync());
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<ChaineProduction>> GetChaineProduction(int id)
        {
            var chaineProduction = await _context.ChaineProductions
                .Where(c => c.IDChaineProduction == id && c.IsActif)
                .FirstOrDefaultAsync();
            if (chaineProduction == null) return NotFound("ChaineProduction not found or inactive.");
            return Ok(chaineProduction);
        }
    }
}