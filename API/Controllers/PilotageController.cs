using API.Services;
using Core.Entities;
using Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using static API.Controllers.DemandeInterventionController;

namespace API.Controllers
{
    /// <summary>
    /// Decision dashboard. Every figure is compared with the previous period of the same
    /// length and can be narrowed to a production line or a machine.
    ///
    /// Definitions (same as the KPI page and the explorer):
    ///  - downtime: requests that stopped an identified machine, from declaration to completion (or now),
    ///    clipped to the period (requests without a machine cannot be attributed to an asset)
    ///  - availability = 1 − downtime / (machines × hours of the period)
    ///  - MTTR = mean(completion − start of work) of breakdowns completed in the period
    ///  - MTBF = (machines × hours − downtime) / breakdowns declared in the period
    ///  - preventive compliance = preventive jobs due in the period done within 2 days of their date
    ///  - overdue = open preventive jobs past their date + open breakdowns older than 48 h
    /// </summary>
    [ApiController]
    [Route("api/pilotage")]
    public class PilotageController : ControllerBase
    {
        private readonly StoreContext _context;
        private readonly ICurrentUserService _currentUser;

        public PilotageController(StoreContext context, ICurrentUserService currentUser)
        {
            _context = context;
            _currentUser = currentUser;
        }

        private sealed record Ot(int Id, string Titre, DateTime Created, int StatusId, bool Stop, int Chaine, string ChaineLib,
            int? Machine, string? MachineCode, string? MachineLib, string Panne, DateTime? Taken, DateTime? Done,
            DateTime? Planned, int? Plan, int? Tech, string? TechName, int Urgence, string UrgenceLib);

        private static double Clip(DateTime start, DateTime? end, DateTime from, DateTime to, DateTime now)
        {
            var s = start < from ? from : start;
            var e = end ?? now;
            if (e > to) e = to;
            return e > s ? (e - s).TotalHours : 0;
        }

        [HttpGet]
        [Authorize(Roles = Roles.Superviseur)]
        public async Task<ActionResult<object>> Get(int days = 30, int? chaineId = null, int? equipementId = null)
        {
            days = days is 7 or 30 or 90 or 365 ? days : 30;
            var now = DateTime.Now;
            var to = now;
            var from = DateTime.Today.AddDays(-days + 1);
            var prevFrom = from.AddDays(-days);
            var today = DateTime.Today;

            // Work orders that matter for the current or previous period, plus everything still open
            var q = _context.DemandeInterventions.AsNoTracking().Where(d => d.IsActif &&
                (d.DateCreation >= prevFrom || d.DateRealisation >= prevFrom || d.DatePlanifiee >= prevFrom || d.StatusId <= StatusEnCours));
            if (chaineId.HasValue) q = q.Where(d => d.IDChaineProduction == chaineId);
            if (equipementId.HasValue) q = q.Where(d => d.IDEquipement == equipementId);

            var ots = await q.Select(d => new Ot(d.IdDemandeIntervention, d.Titre, d.DateCreation, d.StatusId, d.MachineArretee,
                    d.IDChaineProduction, d.ChaineProduction.Libelle, d.IDEquipement,
                    d.Equipement != null ? d.Equipement.CodeEquipement : null, d.Equipement != null ? d.Equipement.Designation : null,
                    d.Panne.Libelle, d.DatePriseEnCharge, d.DateRealisation, d.DatePlanifiee, d.IdPlanPreventif,
                    d.DestinatairesID, d.Destinataire != null ? d.Destinataire.Prenom + " " + d.Destinataire.Nom : null,
                    d.IDUrgence, d.Urgence.Libelle))
                .ToListAsync();
            var valid = ots.Where(o => o.StatusId != StatusAnnulee).ToList();

            // Machines in scope (for availability and MTBF)
            var machinesQ = _context.Equipments.AsNoTracking().Where(e => !e.IsDeleted);
            if (chaineId.HasValue) machinesQ = machinesQ.Where(e => e.IdChaineProduction == chaineId);
            if (equipementId.HasValue) machinesQ = machinesQ.Where(e => e.IdEquipement == equipementId);
            var machines = Math.Max(1, await machinesQ.CountAsync());

            object Period(DateTime pFrom, DateTime pTo)
            {
                var hours = (pTo - pFrom).TotalHours;
                var stops = valid.Where(o => (o.Stop && o.Machine.HasValue) && o.Created < pTo && (o.Done ?? now) > pFrom).ToList();
                var downtime = stops.Sum(o => Clip(o.Created, o.Done, pFrom, pTo, now));
                var breakdowns = valid.Count(o => (o.Stop && o.Machine.HasValue) && o.Created >= pFrom && o.Created < pTo);
                var repaired = valid.Where(o => (o.Stop && o.Machine.HasValue) && o.Done >= pFrom && o.Done < pTo && o.Taken.HasValue).ToList();
                var due = valid.Where(o => o.Plan.HasValue && o.Planned >= pFrom.Date && o.Planned < pTo && o.Planned <= today).ToList();
                var onTime = due.Count(o => o.Done.HasValue && o.Done.Value.Date <= o.Planned!.Value.AddDays(PreventifController.ToleranceJours));
                return new
                {
                    disponibilite = Math.Round(Math.Clamp(100 * (1 - downtime / (machines * hours)), 0, 100), 1),
                    heuresArret = Math.Round(downtime, 1),
                    pannes = breakdowns,
                    declarees = valid.Count(o => o.Created >= pFrom && o.Created < pTo),
                    realisees = valid.Count(o => o.Done >= pFrom && o.Done < pTo),
                    mttr = repaired.Count > 0 ? Math.Round(repaired.Average(o => (o.Done!.Value - o.Taken!.Value).TotalHours), 1) : (double?)null,
                    mtbf = breakdowns > 0 ? Math.Round(Math.Max(0, machines * hours - downtime) / breakdowns, 0) : (double?)null,
                    respectPreventif = due.Count > 0 ? Math.Round(100.0 * onTime / due.Count, 1) : (double?)null,
                    preventifsDus = due.Count
                };
            }

            var current = Period(from, to);
            var previous = Period(prevFrom, from);

            // Backlog right now
            var open = valid.Where(o => o.StatusId <= StatusEnCours).ToList();
            bool Overdue(Ot o) => (o.Plan.HasValue && o.Planned < today) || (!o.Plan.HasValue && (o.Stop && o.Machine.HasValue) && o.Created < now.AddHours(-48));
            var overdue = open.Where(Overdue).ToList();

            // Costs of the period (labour by time logged, parts by issue date, external by completion)
            async Task<(decimal mo, decimal pieces, decimal ext)> CostAsync(DateTime pFrom, DateTime pTo)
            {
                var tq = _context.InterventionTemps.AsNoTracking().Where(t => t.Debut >= pFrom && t.Debut < pTo && t.DemandeIntervention.IsActif);
                var pq = _context.InterventionPieces.AsNoTracking().Where(p => p.Date >= pFrom && p.Date < pTo && p.DemandeIntervention.IsActif);
                var eq = _context.DemandeInterventions.AsNoTracking().Where(d => d.IsActif && d.CoutExterne > 0 && (d.DateRealisation ?? d.DateCreation) >= pFrom && (d.DateRealisation ?? d.DateCreation) < pTo);
                if (chaineId.HasValue)
                {
                    tq = tq.Where(t => t.DemandeIntervention.IDChaineProduction == chaineId);
                    pq = pq.Where(p => p.DemandeIntervention.IDChaineProduction == chaineId);
                    eq = eq.Where(d => d.IDChaineProduction == chaineId);
                }
                if (equipementId.HasValue)
                {
                    tq = tq.Where(t => t.DemandeIntervention.IDEquipement == equipementId);
                    pq = pq.Where(p => p.DemandeIntervention.IDEquipement == equipementId);
                    eq = eq.Where(d => d.IDEquipement == equipementId);
                }
                var mo = await tq.SumAsync(t => (decimal?)(t.DureeMinutes * (t.TauxHoraire ?? t.Technicien.TauxHoraire ?? 0) / 60m)) ?? 0;
                var pc = await pq.SumAsync(p => (decimal?)(p.Quantite * p.PrixUnitaire)) ?? 0;
                var ex = await eq.SumAsync(d => d.CoutExterne) ?? 0;
                return (Math.Round(mo, 3), Math.Round(pc, 3), Math.Round(ex, 3));
            }

            var cost = await CostAsync(from, to);
            var costPrev = await CostAsync(prevFrom, from);

            // Budget for the period: annual budgets prorated by days (plant-wide budgets, or the line's own)
            decimal budget = 0;
            if (!equipementId.HasValue)
            {
                var years = await _context.Budgets.AsNoTracking()
                    .Where(b => b.Annee >= from.Year && b.Annee <= to.Year &&
                                (chaineId.HasValue ? b.IdChaineProduction == chaineId : b.IdChaineProduction == null))
                    .GroupBy(b => b.Annee).Select(g => new { Annee = g.Key, Montant = g.Sum(b => b.Montant) }).ToListAsync();
                foreach (var y in years)
                {
                    var yStart = new DateTime(y.Annee, 1, 1);
                    var yEnd = yStart.AddYears(1);
                    var overlap = (Math.Min(yEnd.Ticks, to.Ticks) - Math.Max(yStart.Ticks, from.Ticks)) / (double)TimeSpan.TicksPerDay;
                    if (overlap > 0) budget += y.Montant * (decimal)(overlap / (yEnd - yStart).TotalDays);
                }
            }

            // Preventive share of labour hours
            var tHours = await _context.InterventionTemps.AsNoTracking()
                .Where(t => t.Debut >= from && t.Debut < to && t.DemandeIntervention.IsActif &&
                            (!chaineId.HasValue || t.DemandeIntervention.IDChaineProduction == chaineId) &&
                            (!equipementId.HasValue || t.DemandeIntervention.IDEquipement == equipementId))
                .GroupBy(t => t.DemandeIntervention.IdPlanPreventif != null)
                .Select(g => new { Preventif = g.Key, Minutes = g.Sum(t => t.DureeMinutes) })
                .ToListAsync();
            var minPrev = tHours.Where(x => x.Preventif).Sum(x => x.Minutes);
            var minAll = tHours.Sum(x => x.Minutes);

            // Trend buckets: days for short periods, weeks for a quarter, months for a year
            var buckets = new List<(string label, DateTime start, DateTime end)>();
            if (days <= 30)
                for (var d = from; d < to; d = d.AddDays(1)) buckets.Add((d.ToString("dd/MM"), d, d.AddDays(1)));
            else if (days == 90)
            {
                var start = from.AddDays(-(((int)from.DayOfWeek + 6) % 7));
                for (var d = start; d < to; d = d.AddDays(7)) buckets.Add(($"S{System.Globalization.ISOWeek.GetWeekOfYear(d)}", d, d.AddDays(7)));
            }
            else
            {
                var start = new DateTime(from.Year, from.Month, 1);
                var culture = new System.Globalization.CultureInfo("fr-FR");
                for (var d = start; d < to; d = d.AddMonths(1)) buckets.Add((d.ToString("MMM yy", culture).Replace(".", ""), d, d.AddMonths(1)));
            }
            var tendance = buckets.Select(b => new
            {
                label = b.label,
                declarees = valid.Count(o => o.Created >= b.start && o.Created < b.end),
                realisees = valid.Count(o => o.Done >= b.start && o.Done < b.end),
                arret = Math.Round(valid.Where(o => (o.Stop && o.Machine.HasValue) && o.Created < b.end && (o.Done ?? now) > b.start).Sum(o => Clip(o.Created, o.Done, b.start, b.end, now)), 1)
            }).ToList();

            var stopsCur = valid.Where(o => (o.Stop && o.Machine.HasValue) && o.Created < to && (o.Done ?? now) > from).ToList();
            var parChaine = stopsCur.GroupBy(o => new { o.Chaine, o.ChaineLib })
                .Select(g => new { id = g.Key.Chaine, chaine = g.Key.ChaineLib, heures = Math.Round(g.Sum(o => Clip(o.Created, o.Done, from, to, now)), 1), pannes = g.Count(o => o.Created >= from) })
                .OrderByDescending(x => x.heures).ToList();
            var pareto = stopsCur.Where(o => o.Created >= from).GroupBy(o => o.Panne)
                .Select(g => new { panne = g.Key, nombre = g.Count(), heures = Math.Round(g.Sum(o => Clip(o.Created, o.Done, from, to, now)), 1) })
                .OrderByDescending(x => x.nombre).ThenByDescending(x => x.heures).Take(8).ToList();
            var topMachines = stopsCur.Where(o => o.Machine.HasValue).GroupBy(o => new { o.Machine, o.MachineCode, o.MachineLib, o.ChaineLib })
                .Select(g => new { id = g.Key.Machine, code = g.Key.MachineCode, designation = g.Key.MachineLib, chaine = g.Key.ChaineLib, pannes = g.Count(o => o.Created >= from), heures = Math.Round(g.Sum(o => Clip(o.Created, o.Done, from, to, now)), 1) })
                .OrderByDescending(x => x.heures).Take(6).ToList();

            // Alerts across modules
            var alertes = new
            {
                machinesArretees = open.Where(o => (o.Stop && o.Machine.HasValue) && o.Machine.HasValue).Select(o => o.Machine).Distinct().Count(),
                nonAffectees = open.Count(o => o.StatusId == StatusATraiter && o.Tech == null),
                preventifsEnRetard = open.Count(o => o.Plan.HasValue && o.Planned < today),
                stockRupture = await _context.Pieces.CountAsync(p => p.IsActif && p.SeuilMinimum > 0 && p.Quantite_Stock <= 0),
                stockSousSeuil = await _context.Pieces.CountAsync(p => p.IsActif && p.SeuilMinimum > 0 && p.Quantite_Stock > 0 && p.Quantite_Stock <= p.SeuilMinimum),
                commandesEnRetard = await _context.BonsCommande.CountAsync(b => (b.Statut == BonCommande.StatutEnvoye || b.Statut == BonCommande.StatutPartiel) && b.DateLivraisonPrevue < today),
                demandesAchat = await _context.DemandesAchat.CountAsync(d => d.Statut == DemandeAchat.StatutSoumise)
            };

            // "To handle now": stopped machines first, then overdue preventive, then unassigned requests
            var aTraiter = open
                .Select(o => new
                {
                    o,
                    rank = (o.Stop && o.Machine.HasValue) ? 0 : Overdue(o) ? 1 : o.Tech == null ? 2 : 3,
                    raison = (o.Stop && o.Machine.HasValue) ? "Machine à l'arrêt" : o.Plan.HasValue && o.Planned < today ? "Préventif en retard" : o.Tech == null ? "Non affectée" : "En attente"
                })
                .Where(x => x.rank < 3)
                .OrderBy(x => x.rank).ThenByDescending(x => x.o.Urgence).ThenBy(x => x.o.Created)
                .Take(8)
                .Select(x => new
                {
                    id = x.o.Id, titre = x.o.Titre, machine = x.o.MachineLib, chaine = x.o.ChaineLib, x.raison, statusId = x.o.StatusId,
                    urgence = x.o.UrgenceLib, technicien = x.o.TechName, depuis = x.o.Plan.HasValue ? x.o.Planned : x.o.Created,
                    heures = Math.Round((now - (x.o.Plan.HasValue && x.o.Planned.HasValue ? x.o.Planned.Value : x.o.Created)).TotalHours, 0)
                })
                .ToList();

            return Ok(new
            {
                periode = new { from, to, days, machines },
                courant = current,
                precedent = previous,
                backlog = open.Count,
                enRetard = overdue.Count,
                cout = new { mainOeuvre = cost.mo, pieces = cost.pieces, externe = cost.ext, total = cost.mo + cost.pieces + cost.ext },
                coutPrecedent = costPrev.mo + costPrev.pieces + costPrev.ext,
                budgetPeriode = Math.Round(budget, 3),
                partPreventif = minAll > 0 ? Math.Round(100.0 * minPrev / minAll, 1) : (double?)null,
                heuresSaisies = Math.Round(minAll / 60.0, 1),
                tendance,
                parChaine,
                pareto,
                topMachines,
                alertes,
                aTraiter
            });
        }

        /// <summary>Personal dashboard for technicians and requesters.</summary>
        [HttpGet("mon-travail")]
        public async Task<ActionResult<object>> MyWork()
        {
            var user = await _currentUser.GetAsync();
            if (user == null) return Unauthorized();
            var today = DateTime.Today;
            var weekStart = today.AddDays(-(((int)today.DayOfWeek + 6) % 7));

            var mine = _context.DemandeInterventions.AsNoTracking().Where(d => d.IsActif &&
                (user.IsTechnicien ? d.DestinatairesID == user.Id : d.DemandeursID == user.Id));

            var ouverts = await mine.Where(d => d.StatusId <= StatusRealisee)
                .OrderBy(d => d.StatusId == StatusEnCours ? 0 : d.StatusId == StatusATraiter ? 1 : 2)
                .ThenByDescending(d => d.MachineArretee).ThenByDescending(d => d.IDUrgence).ThenBy(d => d.DatePlanifiee ?? d.DateCreation)
                .Take(30)
                .Select(d => new
                {
                    d.IdDemandeIntervention, d.Titre, d.StatusId, statut = d.Status.Statut, d.DateCreation, d.DatePlanifiee, d.MachineArretee,
                    urgence = d.Urgence.Libelle, machine = d.Equipement != null ? d.Equipement.Designation : null, chaine = d.ChaineProduction.Libelle,
                    preventif = d.IdPlanPreventif != null, accepte = d.DatePriseEnCharge != null,
                    technicien = d.Destinataire != null ? d.Destinataire.Prenom + " " + d.Destinataire.Nom : null
                })
                .ToListAsync();

            var minutesSemaine = user.IsTechnicien
                ? await _context.InterventionTemps.Where(t => t.IdTechnicien == user.Id && t.Debut >= weekStart).SumAsync(t => (int?)t.DureeMinutes) ?? 0
                : 0;
            var realiseesMois = await mine.CountAsync(d => d.DateRealisation >= today.AddDays(-30));
            var recentes = await mine.Where(d => d.StatusId >= StatusRealisee)
                .OrderByDescending(d => d.DateRealisation ?? d.DateCreation).Take(5)
                .Select(d => new { d.IdDemandeIntervention, d.Titre, d.StatusId, statut = d.Status.Statut, d.DateRealisation, d.DateCloture })
                .ToListAsync();

            return Ok(new
            {
                role = user.Role,
                prenom = user.Entity.Prenom,
                ouverts,
                aujourdhui = ouverts.Count(o => o.DatePlanifiee.HasValue && o.DatePlanifiee.Value.Date == today),
                enCours = ouverts.Count(o => o.StatusId == StatusEnCours),
                aTraiter = ouverts.Count(o => o.StatusId == StatusATraiter),
                aValider = ouverts.Count(o => o.StatusId == StatusRealisee),
                enRetard = ouverts.Count(o => o.StatusId <= StatusEnCours && o.DatePlanifiee.HasValue && o.DatePlanifiee.Value.Date < today),
                heuresSemaine = Math.Round(minutesSemaine / 60.0, 1),
                realiseesMois,
                recentes
            });
        }
    }
}
