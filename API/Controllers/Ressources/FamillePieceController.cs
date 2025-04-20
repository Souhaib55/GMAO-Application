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
    public class FamillePieceController : ControllerBase
    {
        private readonly StoreContext _context;

        public FamillePieceController(StoreContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<FamillePiece>>> GetFamillePieces()
        {
            return Ok(await _context.FamillePieces.Where(f => f.IsActif).ToListAsync());
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<FamillePiece>> GetFamillePiece(int id)
        {
            var famille = await _context.FamillePieces
                .Where(f => f.IDFamillePiece == id && f.IsActif)
                .FirstOrDefaultAsync();
            if (famille == null) return NotFound("Famille not found or inactive.");
            return Ok(famille);
        }
    }
}