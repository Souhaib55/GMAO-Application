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
    }
}