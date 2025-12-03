using API.DTOs;
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
    public class StockEntitiesController : ControllerBase
    {
        private readonly StoreContext _context;

        public StockEntitiesController(StoreContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<StockEntities>>> GetStockEntities()
        {
            return await _context.StockEntities.ToListAsync();
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<StockEntities>> GetStockEntity(int id)
        {
            var entity = await _context.StockEntities.FindAsync(id);
            if (entity == null) return NotFound("Entité de stock introuvable.");
            return Ok(entity);
        }

        [HttpPost]
        public async Task<ActionResult<StockEntities>> CreateStockEntity([FromBody] StockEntitiesDto dto)
        {
            if (dto == null) return BadRequest("Les données de l'entité ne peuvent pas être nulles");
            
            if (string.IsNullOrWhiteSpace(dto.Name))
            {
                return BadRequest("Le nom de l'entité est requis");
            }

            if (await _context.StockEntities.AnyAsync(s => s.Name == dto.Name))
            {
                return BadRequest("Une entité avec ce nom existe déjà.");
            }

            var stockEntity = new StockEntities
            {
                Name = dto.Name
            };

            _context.StockEntities.Add(stockEntity);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetStockEntity), new { id = stockEntity.Id }, stockEntity);
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<StockEntities>> UpdateStockEntity(int id, [FromBody] StockEntitiesDto dto)
        {
            if (dto == null) return BadRequest("Les données de l'entité ne peuvent pas être nulles");

            var existingEntity = await _context.StockEntities.FindAsync(id);
            if (existingEntity == null) return NotFound("Entité de stock introuvable.");

            if (existingEntity.Name != dto.Name &&
                await _context.StockEntities.AnyAsync(s => s.Name == dto.Name))
            {
                return BadRequest("Une entité avec ce nom existe déjà.");
            }

            existingEntity.Name = dto.Name;
            await _context.SaveChangesAsync();

            return Ok(existingEntity);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteStockEntity(int id)
        {
            var entity = await _context.StockEntities.FindAsync(id);
            if (entity == null) return NotFound("Entité de stock introuvable.");

            // Check if entity is used by any stock
            var isUsed = await _context.Stocks.AnyAsync(s => s.StockEntitiesId == id);
            if (isUsed)
            {
                return BadRequest("Cette entité est utilisée par des stocks et ne peut pas être supprimée.");
            }

            _context.StockEntities.Remove(entity);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}