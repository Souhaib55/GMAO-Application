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
        public async Task<ActionResult<IEnumerable<StockStatus>>> GetStockStatuses()
        {
            // Note: La classe StockStatus ne semble pas avoir de propriété IsActif dans sa définition
            // Mais pour être cohérent avec les autres contrôleurs, on filtre si la propriété existe
            return Ok(await _context.StockStatuses.ToListAsync());
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<StockStatus>> GetStockStatus(int id)
        {
            var stockStatus = await _context.StockStatuses
                .FirstOrDefaultAsync(s => s.Id == id);
                
            if (stockStatus == null) return NotFound("Stock status not found.");
            return Ok(stockStatus);
        }

        [HttpPost]
        public async Task<ActionResult<StockStatus>> CreateStockStatus([FromBody] StockStatus stockStatus)
        {
            if (stockStatus == null) return BadRequest("Les données de statut de stock ne peuvent pas être nulles");
            
            // Vérifier si un statut avec ce nom existe déjà
            if (await _context.StockStatuses.AnyAsync(s => s.Status == stockStatus.Status))
            {
                return BadRequest("Un statut de stock avec ce nom existe déjà.");
            }
            
            _context.StockStatuses.Add(stockStatus);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetStockStatus), new { id = stockStatus.Id }, stockStatus);
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<StockStatus>> UpdateStockStatus(int id, [FromBody] StockStatus stockStatus)
        {
            if (stockStatus == null) return BadRequest("Les données de statut de stock ne peuvent pas être nulles");
            if (id != stockStatus.Id) return BadRequest("L'ID ne correspond pas");
            
            var existingStatus = await _context.StockStatuses
                .FirstOrDefaultAsync(s => s.Id == id);
                
            if (existingStatus == null) return NotFound("Statut de stock introuvable.");
            
            // Vérifier si la mise à jour créerait un doublon
            if (existingStatus.Status != stockStatus.Status && 
                await _context.StockStatuses.AnyAsync(s => s.Status == stockStatus.Status))
            {
                return BadRequest("Un statut de stock avec ce nom existe déjà.");
            }
            
            // Mettre à jour les propriétés
            existingStatus.Status = stockStatus.Status;
            
            await _context.SaveChangesAsync();
            
            return Ok(existingStatus);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteStockStatus(int id)
        {
            var stockStatus = await _context.StockStatuses
                .FirstOrDefaultAsync(s => s.Id == id);
                
            if (stockStatus == null) return NotFound("Statut de stock introuvable.");
            
            // Suppression réelle (la classe StockStatus ne semble pas avoir IsActif)
            _context.StockStatuses.Remove(stockStatus);
            await _context.SaveChangesAsync();
            
            return NoContent();
        }
    }
}