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
    public class GroupeEquipementController : ControllerBase
    {
        private readonly StoreContext _context;

        public GroupeEquipementController(StoreContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<GroupeEquipement>>> GetGroupeEquipements()
        {
            return Ok(await _context.GroupeEquipements.Where(g => g.IsActif).ToListAsync());
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<GroupeEquipement>> GetGroupeEquipement(int id)
        {
            var groupe = await _context.GroupeEquipements
                .Where(g => g.IdGroupe == id && g.IsActif)
                .FirstOrDefaultAsync();
            if (groupe == null) return NotFound("Groupe not found or inactive.");
            return Ok(groupe);
        }
    }
}