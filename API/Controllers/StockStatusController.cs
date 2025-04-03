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
            return await _context.StockStatuses.ToListAsync();
        }
    }
}