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
    public class UsersController : ControllerBase
    {
        private readonly StoreContext _context;

        public UsersController(StoreContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Users>>> GetUsers()
        {
            return Ok(await _context.Users
                .Where(u => u.IsActif)
                .Include(u => u.Role)
                .ToListAsync());
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Users>> GetUser(int id)
        {
            var user = await _context.Users
                .Where(u => u.ID == id && u.IsActif)
                .FirstOrDefaultAsync();
            if (user == null) return NotFound("User not found or inactive.");
            return Ok(user);
        }
    }
}