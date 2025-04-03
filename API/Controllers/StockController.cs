using Core.DTOs;
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
    public class StockController : ControllerBase
    {
        private readonly StoreContext _context;

        public StockController(StoreContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Stock>>> GetStocks(int page = 1, int pageSize = 5)
        {
            var totalCount = await _context.Stocks.Where(s => !s.IsDeleted).CountAsync();
            var stocks = await _context.Stocks
                .Where(s => !s.IsDeleted)
                .Include(s => s.StockEntities)
                .Include(s => s.StockStatus)
                .Include(s => s.StockSupplier)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return Ok(new
            {
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize,
                Data = stocks
            });
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Stock>> GetStock(int id)
        {
            var stock = await _context.Stocks
                .Where(s => !s.IsDeleted)
                .Include(s => s.StockEntities)
                .Include(s => s.StockStatus)
                .Include(s => s.StockSupplier)
                .FirstOrDefaultAsync(s => s.Id == id);

            if (stock == null)
                return NotFound();

            return Ok(stock);
        }

        // Update the CreateStock method
        [HttpPost]
        public async Task<ActionResult<Stock>> CreateStock([FromBody] CreateStockDTO stockDto)
        {
            if (stockDto == null) return BadRequest("Stock data cannot be null");
            if (string.IsNullOrWhiteSpace(stockDto.Code)) return BadRequest("Code is required");
            if (string.IsNullOrWhiteSpace(stockDto.Description)) return BadRequest("Description is required");

            // Validate foreign keys
            var stockEntities = await _context.StockEntities.FindAsync(stockDto.StockEntitiesId);
            if (stockEntities == null) return BadRequest($"Invalid StockEntitiesId: {stockDto.StockEntitiesId}");

            var stockStatus = await _context.StockStatuses.FindAsync(stockDto.StockStatusId);
            if (stockStatus == null) return BadRequest($"Invalid StockStatusId: {stockDto.StockStatusId}");

            var stockSupplier = await _context.StockSuppliers.FindAsync(stockDto.StockSupplierId);
            if (stockSupplier == null) return BadRequest($"Invalid StockSupplierId: {stockDto.StockSupplierId}");

            var stock = new Stock
            {
                Code = stockDto.Code,
                Description = stockDto.Description,
                StockEntitiesId = stockDto.StockEntitiesId,
                StockStatusId = stockDto.StockStatusId,
                StockSupplierId = stockDto.StockSupplierId,
                CreatedOn = DateTime.Now // Or use stockDto.CreatedOn if needed
            };

            try
            {
                _context.Stocks.Add(stock);
                await _context.SaveChangesAsync();

                var savedStock = await _context.Stocks
                    .Include(s => s.StockEntities)
                    .Include(s => s.StockStatus)
                    .Include(s => s.StockSupplier)
                    .FirstOrDefaultAsync(s => s.Id == stock.Id);

                return CreatedAtAction(nameof(GetStock), new { id = stock.Id }, savedStock);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateStock(int id, [FromBody] Stock stock)
        {
            if (stock == null) return BadRequest("Stock cannot be null");
            if (id != stock.Id) return BadRequest("Stock ID mismatch");
            if (string.IsNullOrWhiteSpace(stock.Code)) return BadRequest("Code is required");
            if (string.IsNullOrWhiteSpace(stock.Description)) return BadRequest("Description is required");

            var existingStock = await _context.Stocks.FirstOrDefaultAsync(s => s.Id == id);
            if (existingStock == null) return NotFound($"Stock with ID {id} not found");

            var stockEntities = await _context.StockEntities.FirstOrDefaultAsync(se => se.Id == stock.StockEntitiesId);
            if (stockEntities == null) return BadRequest($"Invalid StockEntitiesId: {stock.StockEntitiesId}");

            var stockStatus = await _context.StockStatuses.FirstOrDefaultAsync(ss => ss.Id == stock.StockStatusId);
            if (stockStatus == null) return BadRequest($"Invalid StockStatusId: {stock.StockStatusId}");

            var stockSupplier = await _context.StockSuppliers.FirstOrDefaultAsync(ss => ss.Id == stock.StockSupplierId);
            if (stockSupplier == null) return BadRequest($"Invalid StockSupplierId: {stock.StockSupplierId}");

            try
            {
                existingStock.Code = stock.Code;
                existingStock.Description = stock.Description;
                existingStock.StockEntitiesId = stock.StockEntitiesId;
                existingStock.StockStatusId = stock.StockStatusId;
                existingStock.StockSupplierId = stock.StockSupplierId;
                existingStock.CreatedOn = stock.CreatedOn != default ? stock.CreatedOn : existingStock.CreatedOn;

                await _context.SaveChangesAsync();
                return NoContent();
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteStock(int id)
        {
            var stock = await _context.Stocks.FirstOrDefaultAsync(s => s.Id == id && !s.IsDeleted);
            if (stock == null)
                return NotFound($"Stock with ID {id} not found or already deleted");

            try
            {
                stock.IsDeleted = true;
                await _context.SaveChangesAsync();
                return NoContent();
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }
    }
}