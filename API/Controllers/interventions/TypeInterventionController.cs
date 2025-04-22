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
    }
}