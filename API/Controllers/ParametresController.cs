using System.Text.Json;
using API.Services;
using Core.Entities;
using Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace API.Controllers
{
    /// <summary>
    /// Application settings stored in the database. Today: the Power BI reports shown
    /// on the "Rapports" page (links provided by the BI owner).
    /// </summary>
    [Authorize(Roles = Roles.Superviseur)]
    [ApiController]
    [Route("api/parametres")]
    public class ParametresController : ControllerBase
    {
        public const string ClePowerBi = "rapports.powerbi";

        private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

        private readonly StoreContext _context;
        private readonly ICurrentUserService _currentUser;
        private readonly IJournalService _journal;

        public ParametresController(StoreContext context, ICurrentUserService currentUser, IJournalService journal)
        {
            _context = context;
            _currentUser = currentUser;
            _journal = journal;
        }

        public class RapportPowerBi
        {
            public string Id { get; set; } = Guid.NewGuid().ToString("N")[..8];
            public string Titre { get; set; } = string.Empty;
            public string? Description { get; set; }
            public string Url { get; set; } = string.Empty;
        }

        /// <summary>
        /// Only Power BI Service addresses are accepted, over HTTPS: the secure embed link
        /// (reportEmbed), a report/dashboard link, or a "publish to web" link.
        /// </summary>
        public static string? ValidatePowerBiUrl(string? url)
        {
            if (string.IsNullOrWhiteSpace(url)) return "Le lien est obligatoire.";
            if (url.Length > 2000) return "Le lien est trop long.";
            if (!Uri.TryCreate(url.Trim(), UriKind.Absolute, out var uri) || uri.Scheme != Uri.UriSchemeHttps)
                return "Le lien doit commencer par https://";
            var host = uri.Host.ToLowerInvariant();
            var allowed = host == "app.powerbi.com" || host.EndsWith(".powerbi.com") || host == "app.powerbigov.us" || host.EndsWith(".powerbi.cn");
            if (!allowed) return "Seuls les liens Power BI Service (app.powerbi.com) sont acceptés.";
            return null;
        }

        [HttpGet("powerbi")]
        public async Task<ActionResult<object>> GetPowerBi()
        {
            var param = await _context.ParametresApplication.AsNoTracking().FirstOrDefaultAsync(p => p.Cle == ClePowerBi);
            var rapports = string.IsNullOrWhiteSpace(param?.Valeur)
                ? new List<RapportPowerBi>()
                : JsonSerializer.Deserialize<List<RapportPowerBi>>(param.Valeur, Json) ?? new();
            return Ok(new { rapports, dateModification = param?.DateModification });
        }

        [HttpPut("powerbi")]
        public async Task<ActionResult> SavePowerBi([FromBody] List<RapportPowerBi> rapports)
        {
            var user = await _currentUser.GetAsync();
            if (rapports.Count > 20) return BadRequest(new { message = "20 rapports au maximum." });
            foreach (var r in rapports)
            {
                r.Titre = r.Titre?.Trim() ?? "";
                r.Description = string.IsNullOrWhiteSpace(r.Description) ? null : r.Description.Trim();
                r.Url = r.Url?.Trim() ?? "";
                if (r.Titre.Length < 2 || r.Titre.Length > 100) return BadRequest(new { message = "Chaque rapport doit avoir un titre (100 caractères maximum)." });
                if (r.Description?.Length > 300) return BadRequest(new { message = "Description : 300 caractères maximum." });
                var error = ValidatePowerBiUrl(r.Url);
                if (error != null) return BadRequest(new { message = $"« {r.Titre} » : {error}" });
                if (string.IsNullOrWhiteSpace(r.Id) || r.Id.Length > 40) r.Id = Guid.NewGuid().ToString("N")[..8];
            }

            var param = await _context.ParametresApplication.FirstOrDefaultAsync(p => p.Cle == ClePowerBi);
            if (param == null)
            {
                param = new ParametreApplication { Cle = ClePowerBi };
                _context.ParametresApplication.Add(param);
            }
            param.Valeur = JsonSerializer.Serialize(rapports, Json);
            param.DateModification = DateTime.Now;
            _journal.Add(user, "Parametre", null, "Rapports Power BI", $"{rapports.Count} rapport(s)");
            await _context.SaveChangesAsync();
            return Ok();
        }
    }
}
