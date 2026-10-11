using API.Security;
using API.DTOs;
using Core.Entities;
using Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace API.Controllers
{
    [SupervisorWrites]
    [ApiController]
    [Route("api/[controller]")]
    public class StockSupplierController : ControllerBase
    {
        private readonly StoreContext _context;

        public StockSupplierController(StoreContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<StockSupplier>>> GetStockSuppliers()
        {
            return await _context.StockSuppliers.ToListAsync();
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<StockSupplier>> GetStockSupplier(int id)
        {
            var supplier = await _context.StockSuppliers.FindAsync(id);
            if (supplier == null) return NotFound("Fournisseur introuvable.");
            return Ok(supplier);
        }

        [HttpPost]
        public async Task<ActionResult<StockSupplier>> CreateStockSupplier([FromBody] StockSupplierDto dto)
        {
            if (dto == null) return BadRequest("Les données du fournisseur ne peuvent pas être nulles");
            
            if (string.IsNullOrWhiteSpace(dto.SupplierName))
            {
                return BadRequest("Le nom du fournisseur est requis");
            }

            if (await _context.StockSuppliers.AnyAsync(s => s.SupplierName == dto.SupplierName))
            {
                return BadRequest("Un fournisseur avec ce nom existe déjà.");
            }

            var stockSupplier = new StockSupplier
            {
                SupplierName = dto.SupplierName
            };

            _context.StockSuppliers.Add(stockSupplier);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetStockSupplier), new { id = stockSupplier.Id }, stockSupplier);
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<StockSupplier>> UpdateStockSupplier(int id, [FromBody] StockSupplierDto dto)
        {
            if (dto == null) return BadRequest("Les données du fournisseur ne peuvent pas être nulles");

            var existingSupplier = await _context.StockSuppliers.FindAsync(id);
            if (existingSupplier == null) return NotFound("Fournisseur introuvable.");

            if (existingSupplier.SupplierName != dto.SupplierName &&
                await _context.StockSuppliers.AnyAsync(s => s.SupplierName == dto.SupplierName))
            {
                return BadRequest("Un fournisseur avec ce nom existe déjà.");
            }

            existingSupplier.SupplierName = dto.SupplierName;
            await _context.SaveChangesAsync();

            return Ok(existingSupplier);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteStockSupplier(int id)
        {
            var supplier = await _context.StockSuppliers.FindAsync(id);
            if (supplier == null) return NotFound("Fournisseur introuvable.");

            // Check if supplier is used by any stock
            var isUsed = await _context.Stocks.AnyAsync(s => s.StockSupplierId == id);
            if (isUsed)
            {
                return BadRequest("Ce fournisseur est utilisé par des stocks et ne peut pas être supprimé.");
            }

            _context.StockSuppliers.Remove(supplier);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}