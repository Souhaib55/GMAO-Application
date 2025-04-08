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
    public class EquipmentCriticiteController : ControllerBase
    {
        private readonly StoreContext _context;

        public EquipmentCriticiteController(StoreContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<EquipmentCriticite>>> GetEquipmentCriticites()
        {
            return Ok(await _context.EquipmentCriticites.Where(c => c.IsActif).ToListAsync());
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<EquipmentCriticite>> GetEquipmentCriticite(int id)
        {
            var criticite = await _context.EquipmentCriticites
                .Where(c => c.IdCriticite == id && c.IsActif)
                .FirstOrDefaultAsync();
            if (criticite == null) return NotFound("Criticite not found or inactive.");
            return Ok(criticite);
        }
    }
}