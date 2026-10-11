using API.Services;
using Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace API.Controllers
{
    /// <summary>Audit trail, read-only, for the supervisor.</summary>
    [Authorize(Roles = Roles.Superviseur)]
    [ApiController]
    [Route("api/journal")]
    public class JournalController : ControllerBase
    {
        private readonly StoreContext _context;

        public JournalController(StoreContext context) => _context = context;

        [HttpGet]
        public async Task<ActionResult<object>> Get(string? entite = null, int? entiteId = null, string? search = null,
            DateTime? from = null, DateTime? to = null, int page = 1, int pageSize = 50)
        {
            page = Math.Max(1, page);
            pageSize = Math.Clamp(pageSize, 10, 200);
            var query = _context.JournalActivites.AsNoTracking().AsQueryable();
            if (!string.IsNullOrWhiteSpace(entite)) query = query.Where(j => j.Entite == entite);
            if (entiteId.HasValue) query = query.Where(j => j.EntiteId == entiteId);
            if (from.HasValue) query = query.Where(j => j.Date >= from.Value.Date);
            if (to.HasValue) query = query.Where(j => j.Date < to.Value.Date.AddDays(1));
            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim();
                query = query.Where(j => j.Action.Contains(s) || (j.Details != null && j.Details.Contains(s)) || (j.UtilisateurNom != null && j.UtilisateurNom.Contains(s)));
            }

            var total = await query.CountAsync();
            var data = await query.OrderByDescending(j => j.Date).ThenByDescending(j => j.Id)
                .Skip((page - 1) * pageSize).Take(pageSize)
                .Select(j => new { j.Id, j.Date, j.UtilisateurNom, j.Entite, j.EntiteId, j.Action, j.Details })
                .ToListAsync();
            return Ok(new { data, totalCount = total, page, pageSize });
        }
    }
}
