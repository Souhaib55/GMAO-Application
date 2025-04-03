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
    }
}