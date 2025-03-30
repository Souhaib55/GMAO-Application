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

        // GET: api/EquipmentCriticite
        [HttpGet]
        public async Task<ActionResult<IEnumerable<EquipmentCriticite>>> GetEquipmentCriticites()
        {
            return await _context.EquipmentCriticites.ToListAsync();
        }

        // GET: api/EquipmentCriticite/5
        [HttpGet("{id}")]
        public async Task<ActionResult<EquipmentCriticite>> GetEquipmentCriticite(int id)
        {
            var equipmentCriticite = await _context.EquipmentCriticites.FindAsync(id);

            if (equipmentCriticite == null)
            {
                return NotFound();
            }

            return equipmentCriticite;
        }
    }
}