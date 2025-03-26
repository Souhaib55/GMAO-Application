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

        // GET: api/familleequipment
        [HttpGet]
        public async Task<ActionResult<IEnumerable<FamilleEquipment>>> GetFamilleEquipments()
        {
            return await _context.FamilleEquipments.ToListAsync();
        }

        // GET: api/familleequipment/5
        [HttpGet("{id}")]
        public async Task<ActionResult<FamilleEquipment>> GetFamilleEquipment(int id)
        {
            var familleEquipment = await _context.FamilleEquipments.FindAsync(id);

            if (familleEquipment == null)
            {
                return NotFound();
            }

            return familleEquipment;
        }
    }
}