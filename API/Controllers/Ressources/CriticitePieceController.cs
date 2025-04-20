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
    public class CriticitePieceController : ControllerBase
    {
        private readonly StoreContext _context;

        public CriticitePieceController(StoreContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<CriticitePiece>>> GetCriticitePieces()
        {
            return Ok(await _context.CriticitePieces.Where(c => c.IsActif).ToListAsync());
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<CriticitePiece>> GetCriticitePiece(int id)
        {
            var criticite = await _context.CriticitePieces
                .Where(c => c.IDCriticitePiece == id && c.IsActif)
                .FirstOrDefaultAsync();
            if (criticite == null) return NotFound("Criticite not found or inactive.");
            return Ok(criticite);
        }
    }
}