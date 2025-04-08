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
    public class FamilleEquipmentController : ControllerBase
    {
        private readonly StoreContext _context;

        public FamilleEquipmentController(StoreContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<FamilleEquipment>>> GetFamilleEquipments()
        {
            return Ok(await _context.FamilleEquipements.Where(f => f.IsActif).ToListAsync());
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<FamilleEquipment>> GetFamilleEquipment(int id)
        {
            var famille = await _context.FamilleEquipements
                .Where(f => f.IdFamille == id && f.IsActif)
                .FirstOrDefaultAsync();
            if (famille == null) return NotFound("Famille not found or inactive.");
            return Ok(famille);
        }
    }
}