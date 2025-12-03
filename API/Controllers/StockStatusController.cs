using API.DTOs;
using Core.Entities;
using Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class StockStatusController : ControllerBase
    {
        private readonly StoreContext _context;

        public StockStatusController(StoreContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<object>>> GetStockStatuses()
        {
            var statuses = await _context.StockStatuses.ToListAsync();
            // Map to DTO format expected by frontend (statusName instead of Status)
            var result = statuses.Select(s => new { id = s.Id, statusName = s.Status }).ToList();
            return Ok(result);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<object>> GetStockStatus(int id)
        {
            var stockStatus = await _context.StockStatuses
                .FirstOrDefaultAsync(s => s.Id == id);
                
            if (stockStatus == null) return NotFound("Stock status not found.");
            return Ok(new { id = stockStatus.Id, statusName = stockStatus.Status });
        }

        [HttpPost]
        public async Task<ActionResult<object>> CreateStockStatus([FromBody] StockStatusDto dto)
        {
            if (dto == null) return BadRequest("Les données de statut de stock ne peuvent pas être nulles");
            
            if (string.IsNullOrWhiteSpace(dto.StatusName))
            {
                return BadRequest("Le nom du statut est requis");
            }
            
            // Vérifier si un statut avec ce nom existe déjà
            if (await _context.StockStatuses.AnyAsync(s => s.Status == dto.StatusName))
            {
                return BadRequest("Un statut de stock avec ce nom existe déjà.");
            }

            var stockStatus = new StockStatus
            {
                Status = dto.StatusName
            };
            
            _context.StockStatuses.Add(stockStatus);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetStockStatus), new { id = stockStatus.Id }, 
                new { id = stockStatus.Id, statusName = stockStatus.Status });
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<object>> UpdateStockStatus(int id, [FromBody] StockStatusDto dto)
        {
            if (dto == null) return BadRequest("Les données de statut de stock ne peuvent pas être nulles");
            
            var existingStatus = await _context.StockStatuses
                .FirstOrDefaultAsync(s => s.Id == id);
                
            if (existingStatus == null) return NotFound("Statut de stock introuvable.");
            
            // Vérifier si la mise à jour créerait un doublon
            if (existingStatus.Status != dto.StatusName && 
                await _context.StockStatuses.AnyAsync(s => s.Status == dto.StatusName))
            {
                return BadRequest("Un statut de stock avec ce nom existe déjà.");
            }
            
            // Mettre à jour les propriétés
            existingStatus.Status = dto.StatusName;
            
            await _context.SaveChangesAsync();
            
            return Ok(new { id = existingStatus.Id, statusName = existingStatus.Status });
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteStockStatus(int id)
        {
            var stockStatus = await _context.StockStatuses
                .FirstOrDefaultAsync(s => s.Id == id);
                
            if (stockStatus == null) return NotFound("Statut de stock introuvable.");

            // Check if status is used by any stock
            var isUsed = await _context.Stocks.AnyAsync(s => s.StockStatusId == id);
            if (isUsed)
            {
                return BadRequest("Ce statut est utilisé par des stocks et ne peut pas être supprimé.");
            }
            
            _context.StockStatuses.Remove(stockStatus);
            await _context.SaveChangesAsync();
            
            return NoContent();
        }
    }
}