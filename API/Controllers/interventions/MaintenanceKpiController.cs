using API.Services.Kpi;
using System.Globalization;
using System.Text;
using Core.Entities;
using Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace API.Controllers
{
    /// <summary>
    /// Maintenance performance indicators for the dashboard.
    ///
    /// Definitions (hours unless stated):
    ///  - MTTR   : mean of (DateRealisation - DatePriseEnCharge) for jobs completed in the period
    ///  - MTTA   : mean of (DatePriseEnCharge - DateCreation), i.e. response delay
    ///  - Downtime: for requests that stopped an identified machine, (DateRealisation or now) - DateCreation,
    ///             clipped to the period, overlapping stops of one machine counted once (KpiCalculator)
    ///  - Availability: 1 - downtime / (machines x hours in period)
    ///  - MTBF   : (machines x hours - downtime) / number of breakdowns in the period
    /// Supervisors see the whole plant; other roles see their own requests / assignments.
    /// </summary>
    [Authorize]
    [ApiController]
    [Route("api/kpi")]
    public class MaintenanceKpiController : ControllerBase
    {
        private readonly StoreContext _context;
        private readonly UserManager<AppUser> _userManager;

        public MaintenanceKpiController(StoreContext context, UserManager<AppUser> userManager)
        {
            _context = context;
            _userManager = userManager;
        }

        private sealed class Row
        {
            public int Id { get; init; }
            public DateTime Created { get; init; }
            public int StatusId { get; init; }
            public bool Stop { get; init; }
            public string Type { get; init; } = "";
            public string Line { get; init; } = "";
            public string Panne { get; init; } = "";
            public int RequesterId { get; init; }
            public string Requester { get; init; } = "";
            public int? TechId { get; init; }
            public string? Tech { get; init; }
            public int? EquipmentId { get; init; }
            public string? EquipmentCode { get; init; }
            public string? EquipmentName { get; init; }
            public DateTime? Taken { get; init; }
            public DateTime? Done { get; init; }
            public DateTime? Closed { get; init; }

            public bool IsCancelled => StatusId == DemandeInterventionController.StatusAnnulee;
            public bool IsOpen => StatusId is DemandeInterventionController.StatusATraiter or DemandeInterventionController.StatusEnCours;
            public bool IsPreventive => Normalize(Type).Contains("prevent") || Type.Contains("ventive", StringComparison.OrdinalIgnoreCase);
        }

        private static string Normalize(string value)
        {
            var decomposed = value.ToLowerInvariant().Normalize(NormalizationForm.FormD);
            var sb = new StringBuilder();
            foreach (var c in decomposed)
                if (CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark) sb.Append(c);
            return sb.ToString();
        }

        private static double Hours(DateTime from, DateTime to) => Math.Max(0, (to - from).TotalHours);
        private static double Round(double value, int digits = 1) => Math.Round(value, digits, MidpointRounding.AwayFromZero);
        private static double? Mean(IEnumerable<double> values)
        {
            var list = values.ToList();
            return list.Count == 0 ? null : Round(list.Average());
        }

        [HttpGet]
        public async Task<ActionResult<object>> Get(int days = 30)
        {
            days = days switch { <= 7 => 7, <= 30 => 30, <= 90 => 90, _ => 365 };

            var appUser = await _userManager.GetUserAsync(User);
            if (appUser == null) return Unauthorized();
            var role = (await _userManager.GetRolesAsync(appUser)).FirstOrDefault();
            var me = await _context.Users.FirstOrDefaultAsync(u => u.AppUserId == appUser.Id && u.IsActif);
            if (me == null || role == null) return Unauthorized();

            var now = DateTime.Now;
            var from = now.AddDays(-days);
            var periodHours = Hours(from, now);

            var query = _context.DemandeInterventions.Where(d => d.IsActif);
            if (role == "Demandeur") query = query.Where(d => d.DemandeursID == me.ID);
            else if (role != "Superviseur") query = query.Where(d => d.DemandeursID == me.ID || d.DestinatairesID == me.ID);

            // Everything created in the period, plus anything still open or finished in the period
            var rows = await query
                .Where(d => d.DateCreation >= from
                            || d.StatusId == DemandeInterventionController.StatusATraiter
                            || d.StatusId == DemandeInterventionController.StatusEnCours
                            || (d.DateRealisation != null && d.DateRealisation >= from)
                            || (d.DateCloture != null && d.DateCloture >= from))
                .Select(d => new Row
                {
                    Id = d.IdDemandeIntervention,
                    Created = d.DateCreation,
                    StatusId = d.StatusId,
                    Stop = d.MachineArretee,
                    Type = d.TypeIntervention.Libelle,
                    Line = d.ChaineProduction.Libelle,
                    Panne = d.Panne.Libelle,
                    RequesterId = d.DemandeursID,
                    Requester = d.Demandeur.Prenom + " " + d.Demandeur.Nom,
                    TechId = d.DestinatairesID,
                    Tech = d.Destinataire != null ? d.Destinataire.Prenom + " " + d.Destinataire.Nom : null,
                    EquipmentId = d.IDEquipement,
                    EquipmentCode = d.Equipement != null ? d.Equipement.CodeEquipement : null,
                    EquipmentName = d.Equipement != null ? d.Equipement.Designation : null,
                    Taken = d.DatePriseEnCharge,
                    Done = d.DateRealisation,
                    Closed = d.DateCloture
                })
                .AsNoTracking()
                .ToListAsync();

            var created = rows.Where(r => r.Created >= from).ToList();
            var createdValid = created.Where(r => !r.IsCancelled).ToList();
            var completedInPeriod = rows.Where(r => r.Done.HasValue && r.Done >= from).ToList();
            // Same definitions as the dashboard (KpiCalculator): a breakdown stopped an identified
            // machine, and overlapping stops of one machine are counted once
            var breakdowns = createdValid.Where(r => r.Stop && r.EquipmentId.HasValue).ToList();
            var downtimeRows = rows.Where(r => r.Stop && r.EquipmentId.HasValue && !r.IsCancelled && (r.Done ?? now) >= from).ToList();
            var attributed = KpiCalculator.AttribuerHeuresArret(
                downtimeRows.Select(r => new ArretMachine(r.EquipmentId!.Value, r.Created, r.Done)).ToList(), from, now, now);
            var downtimeById = downtimeRows.Select((r, i) => (r.Id, h: attributed[i])).ToDictionary(x => x.Id, x => x.h);
            double Downtime(Row r) => downtimeById.GetValueOrDefault(r.Id);
            var totalDowntime = attributed.Sum();

            var machineCount = Math.Max(1, await _context.Equipments.CountAsync(e => !e.IsDeleted));

            var mttr = KpiCalculator.Mttr(completedInPeriod.Where(r => r.Taken.HasValue).Select(r => (r.Taken!.Value, r.Done!.Value)));
            var mtta = Mean(created.Where(r => r.Taken.HasValue && r.Taken >= r.Created).Select(r => Hours(r.Created, r.Taken!.Value)));
            var mtbf = KpiCalculator.Mtbf(machineCount, periodHours, totalDowntime, breakdowns.Count);

            var open = rows.Where(r => r.IsOpen).ToList();

            var summary = new
            {
                created = created.Count,
                completed = completedInPeriod.Count,
                closed = rows.Count(r => r.Closed.HasValue && r.Closed >= from),
                cancelled = created.Count(r => r.IsCancelled),
                completionRate = createdValid.Count == 0 ? (double?)null
                    : Round(100.0 * createdValid.Count(r => r.StatusId is DemandeInterventionController.StatusRealisee or DemandeInterventionController.StatusCloturee) / createdValid.Count),
                mttrHours = mttr,
                responseHours = mtta,
                mtbfHours = mtbf,
                downtimeHours = Round(totalDowntime),
                availability = KpiCalculator.Disponibilite(totalDowntime, machineCount, periodHours),
                preventiveShare = createdValid.Count == 0 ? (double?)null : Round(100.0 * createdValid.Count(r => r.IsPreventive) / createdValid.Count),
                breakdowns = breakdowns.Count,
                backlog = open.Count,
                backlogOverdue = open.Count(r => Hours(r.Created, now) > 72),
                machines = machineCount
            };

            // Lines / machines active in the period: new requests plus stops still running
            var activeInPeriod = createdValid.Concat(downtimeRows).DistinctBy(r => r.Id).ToList();

            var byLine = activeInPeriod
                .GroupBy(r => r.Line)
                .Select(g => new
                {
                    label = g.Key,
                    interventions = g.Count(r => r.Created >= from),
                    stops = g.Count(r => r.Stop),
                    downtimeHours = Round(downtimeRows.Where(r => r.Line == g.Key).Sum(Downtime))
                })
                .OrderByDescending(x => x.downtimeHours).ThenByDescending(x => x.interventions)
                .ToList();

            // Pareto of breakdown types (corrective work only)
            var panneGroups = breakdowns
                .GroupBy(r => r.Panne)
                .Select(g => new { label = g.Key, count = g.Count() })
                .OrderByDescending(x => x.count)
                .ToList();
            var panneTotal = panneGroups.Sum(x => x.count);
            var cumulative = 0;
            var pareto = panneGroups.Select(x =>
            {
                cumulative += x.count;
                return new { x.label, x.count, share = Round(100.0 * x.count / panneTotal), cumulative = Round(100.0 * cumulative / panneTotal) };
            }).ToList();

            var byRequester = createdValid
                .GroupBy(r => new { r.RequesterId, r.Requester })
                .Select(g => new
                {
                    label = g.Key.Requester.Trim(),
                    requests = g.Count(),
                    stops = g.Count(r => r.Stop),
                    stopRate = Round(100.0 * g.Count(r => r.Stop) / g.Count())
                })
                .OrderByDescending(x => x.requests)
                .Take(8)
                .ToList();

            var byTechnician = rows
                .Where(r => r.TechId.HasValue && !r.IsCancelled)
                .GroupBy(r => new { r.TechId, r.Tech })
                .Select(g => new
                {
                    label = (g.Key.Tech ?? "").Trim(),
                    open = g.Count(r => r.IsOpen),
                    completed = g.Count(r => r.Done.HasValue && r.Done >= from),
                    mttrHours = Mean(g.Where(r => r.Done >= from && r.Taken.HasValue && r.Done >= r.Taken).Select(r => Hours(r.Taken!.Value, r.Done!.Value)))
                })
                .OrderByDescending(x => x.open + x.completed)
                .ToList();

            var topEquipment = activeInPeriod
                .Where(r => r.EquipmentId.HasValue)
                .GroupBy(r => new { r.EquipmentId, r.EquipmentCode, r.EquipmentName })
                .Select(g => new
                {
                    code = g.Key.EquipmentCode,
                    label = g.Key.EquipmentName,
                    interventions = g.Count(),
                    downtimeHours = Round(downtimeRows.Where(r => r.EquipmentId == g.Key.EquipmentId).Sum(Downtime))
                })
                .OrderByDescending(x => x.interventions).ThenByDescending(x => x.downtimeHours)
                .Take(5)
                .ToList();

            var backlogAging = new[]
            {
                new { label = "< 24 h", count = open.Count(r => Hours(r.Created, now) < 24) },
                new { label = "1 – 3 j", count = open.Count(r => Hours(r.Created, now) is >= 24 and < 72) },
                new { label = "3 – 7 j", count = open.Count(r => Hours(r.Created, now) is >= 72 and < 168) },
                new { label = "> 7 j", count = open.Count(r => Hours(r.Created, now) >= 168) }
            };

            // Trend: weekly buckets up to 90 days, monthly beyond
            var trend = new List<object>();
            var culture = CultureInfo.GetCultureInfo("fr-FR");
            if (days <= 90)
            {
                var weekStart = now.Date.AddDays(-(((int)now.DayOfWeek + 6) % 7)); // Monday
                var buckets = Math.Max(4, (int)Math.Ceiling(days / 7.0));
                for (var i = buckets - 1; i >= 0; i--)
                {
                    var start = weekStart.AddDays(-7 * i);
                    var end = start.AddDays(7);
                    trend.Add(new
                    {
                        label = start.ToString("d MMM", culture),
                        created = rows.Count(r => r.Created >= start && r.Created < end),
                        closed = rows.Count(r => r.Closed >= start && r.Closed < end)
                    });
                }
            }
            else
            {
                var monthStart = new DateTime(now.Year, now.Month, 1);
                for (var i = 11; i >= 0; i--)
                {
                    var start = monthStart.AddMonths(-i);
                    var end = start.AddMonths(1);
                    trend.Add(new
                    {
                        label = start.ToString("MMM yy", culture),
                        created = rows.Count(r => r.Created >= start && r.Created < end),
                        closed = rows.Count(r => r.Closed >= start && r.Closed < end)
                    });
                }
            }

            return Ok(new
            {
                periodDays = days,
                scope = role == "Superviseur" ? "usine" : "personnel",
                summary,
                byLine,
                pareto,
                byRequester,
                byTechnician,
                topEquipment,
                backlogAging,
                trend
            });
        }
    }
}
