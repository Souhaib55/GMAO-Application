using API.Services;
using API.Services.Kpi;
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
    ///    clipped to the period (requests without a machine cannot be attributed to an asset);
    ///    overlapping requests on the same machine count once (see KpiCalculator)
    ///  - availability = 1 − downtime / (machines × hours of the period)
    ///  - MTTR = mean(completion − start of work) of breakdowns completed in the period
    ///  - MTBF = (machines × hours − downtime) / breakdowns declared in the period
    ///  - preventive compliance = preventive jobs due in the period done within 2 days of their date
    ///  - overdue = open preventive jobs past their date + open breakdowns older than 48 h
    ///  - previous period = same length just before (rolling periods) or the previous calendar month (?mois=)
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
            DateTime? Planned, int? Plan, int? Tech, string? TechName, int Urgence, string UrgenceLib, int PanneId)
        {
            /// <summary>Counts in downtime, MTBF and availability: it stopped an identified machine.</summary>
            public bool IsArret => Stop && Machine.HasValue;
        }

        /// <summary>Indicators of one period; the raw counts behind them feed the "?" explanations.</summary>
        public sealed record PeriodeKpi(double Disponibilite, double HeuresArret, int Pannes, int Declarees, int Realisees,
            double? Mttr, double? Mtbf, double? RespectPreventif, int PreventifsDus, int PreventifsATemps,
            int Reparations, double HeuresReparation, double HeuresPeriode);

        private static readonly System.Globalization.CultureInfo Fr = System.Globalization.CultureInfo.GetCultureInfo("fr-FR");

        /// <summary>
        /// Period of the dashboard: the last <paramref name="days"/> days (today included), or a
        /// calendar month ("2026-10") for the monthly report. The comparison period has the same
        /// length (rolling periods) or is the previous calendar month (monthly report).
        /// </summary>
        public static (DateTime from, DateTime to, DateTime prevFrom, DateTime prevTo, string libelle, string libellePrec)
            Periodes(int days, string? mois, DateTime now)
        {
            if (!string.IsNullOrEmpty(mois) && DateTime.TryParseExact(mois + "-01", "yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture,
                    System.Globalization.DateTimeStyles.None, out var debutMois) && debutMois <= now)
            {
                var finMois = debutMois.AddMonths(1);
                var prec = debutMois.AddMonths(-1);
                return (debutMois, finMois < now ? finMois : now, prec, debutMois,
                    debutMois.ToString("MMMM yyyy", Fr), "en " + prec.ToString("MMMM yyyy", Fr));
            }
            var from = now.Date.AddDays(-days + 1);
            var (pf, pt) = KpiCalculator.PeriodePrecedente(from, now);
            var libelle = days switch { 7 => "ces 7 jours", 365 => "ces 12 mois", _ => $"ces {days} jours" };
            var libellePrec = days switch { 7 => "les 7 jours précédents", 365 => "les 12 mois précédents", _ => $"les {days} jours précédents" };
            return (from, now, pf, pt, libelle, libellePrec);
        }

        [HttpGet]
        [Authorize(Roles = Roles.Superviseur)]
        public async Task<ActionResult<object>> Get(int days = 30, int? chaineId = null, int? equipementId = null, string? mois = null)
        {
            days = days is 7 or 30 or 90 or 365 ? days : 30;
            var now = DateTime.Now;
            var today = DateTime.Today;
            var (from, to, prevFrom, prevTo, libelle, libellePrec) = Periodes(days, mois, now);

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
                    d.IDUrgence, d.Urgence.Libelle, d.IDPanne))
                .ToListAsync();
            var valid = ots.Where(o => o.StatusId != StatusAnnulee).ToList();

            // Machines in scope (for availability and MTBF)
            var machinesQ = _context.Equipments.AsNoTracking().Where(e => !e.IsDeleted);
            if (chaineId.HasValue) machinesQ = machinesQ.Where(e => e.IdChaineProduction == chaineId);
            if (equipementId.HasValue) machinesQ = machinesQ.Where(e => e.IdEquipement == equipementId);
            var machines = Math.Max(1, await machinesQ.CountAsync());

            var arrets = valid.Where(o => o.IsArret).ToList();
            var arretsKpi = arrets.Select(o => new ArretMachine(o.Machine!.Value, o.Created, o.Done)).ToList();
            double[] Heures(DateTime pFrom, DateTime pTo) => KpiCalculator.AttribuerHeuresArret(arretsKpi, pFrom, pTo, now);

            PeriodeKpi Period(DateTime pFrom, DateTime pTo)
            {
                var hours = (pTo - pFrom).TotalHours;
                var downtime = Heures(pFrom, pTo).Sum();
                var breakdowns = arrets.Count(o => o.Created >= pFrom && o.Created < pTo);
                var repaired = arrets.Where(o => o.Done >= pFrom && o.Done < pTo && o.Taken.HasValue && o.Done >= o.Taken).ToList();
                var due = valid.Where(o => o.Plan.HasValue && o.Planned >= pFrom.Date && o.Planned < pTo && o.Planned <= today).ToList();
                var onTime = due.Count(o => o.Done.HasValue && o.Done.Value.Date <= o.Planned!.Value.AddDays(PreventifController.ToleranceJours));
                return new PeriodeKpi(
                    Disponibilite: KpiCalculator.Disponibilite(downtime, machines, hours),
                    HeuresArret: Math.Round(downtime, 1),
                    Pannes: breakdowns,
                    Declarees: valid.Count(o => o.Created >= pFrom && o.Created < pTo),
                    Realisees: valid.Count(o => o.Done >= pFrom && o.Done < pTo),
                    Mttr: KpiCalculator.Mttr(repaired.Select(o => (o.Taken!.Value, o.Done!.Value))),
                    Mtbf: KpiCalculator.Mtbf(machines, hours, downtime, breakdowns),
                    RespectPreventif: KpiCalculator.Taux(onTime, due.Count),
                    PreventifsDus: due.Count,
                    PreventifsATemps: onTime,
                    Reparations: repaired.Count,
                    HeuresReparation: Math.Round(repaired.Sum(o => (o.Done!.Value - o.Taken!.Value).TotalHours), 1),
                    HeuresPeriode: Math.Round(hours, 1));
            }

            var current = Period(from, to);
            var previous = Period(prevFrom, prevTo);

            // Backlog right now
            var open = valid.Where(o => o.StatusId <= StatusEnCours).ToList();
            bool Overdue(Ot o) => (o.Plan.HasValue && o.Planned < today) || (!o.Plan.HasValue && o.IsArret && o.Created < now.AddHours(-48));
            var overdue = open.Where(Overdue).ToList();

            // Costs (labour by time logged, parts by issue date, external by completion), optionally per machine
            IQueryable<InterventionTemps> TempsQ(DateTime pFrom, DateTime pTo)
            {
                var tq = _context.InterventionTemps.AsNoTracking().Where(t => t.Debut >= pFrom && t.Debut < pTo && t.DemandeIntervention.IsActif);
                if (chaineId.HasValue) tq = tq.Where(t => t.DemandeIntervention.IDChaineProduction == chaineId);
                if (equipementId.HasValue) tq = tq.Where(t => t.DemandeIntervention.IDEquipement == equipementId);
                return tq;
            }
            IQueryable<InterventionPiece> PiecesQ(DateTime pFrom, DateTime pTo)
            {
                var pq = _context.InterventionPieces.AsNoTracking().Where(p => p.Date >= pFrom && p.Date < pTo && p.DemandeIntervention.IsActif);
                if (chaineId.HasValue) pq = pq.Where(p => p.DemandeIntervention.IDChaineProduction == chaineId);
                if (equipementId.HasValue) pq = pq.Where(p => p.DemandeIntervention.IDEquipement == equipementId);
                return pq;
            }
            IQueryable<DemandeIntervention> ExterneQ(DateTime pFrom, DateTime pTo)
            {
                var eq = _context.DemandeInterventions.AsNoTracking().Where(d => d.IsActif && d.CoutExterne > 0 && (d.DateRealisation ?? d.DateCreation) >= pFrom && (d.DateRealisation ?? d.DateCreation) < pTo);
                if (chaineId.HasValue) eq = eq.Where(d => d.IDChaineProduction == chaineId);
                if (equipementId.HasValue) eq = eq.Where(d => d.IDEquipement == equipementId);
                return eq;
            }
            async Task<(decimal mo, decimal pieces, decimal ext)> CostAsync(DateTime pFrom, DateTime pTo)
            {
                var mo = await TempsQ(pFrom, pTo).SumAsync(t => (decimal?)(t.DureeMinutes * (t.TauxHoraire ?? t.Technicien.TauxHoraire ?? 0) / 60m)) ?? 0;
                var pc = await PiecesQ(pFrom, pTo).SumAsync(p => (decimal?)(p.Quantite * p.PrixUnitaire)) ?? 0;
                var ex = await ExterneQ(pFrom, pTo).SumAsync(d => d.CoutExterne) ?? 0;
                return (Math.Round(mo, 3), Math.Round(pc, 3), Math.Round(ex, 3));
            }

            var cost = await CostAsync(from, to);
            var costPrev = await CostAsync(prevFrom, prevTo);

            // Cost per machine over the period (labour + parts + external)
            var coutMachine = new Dictionary<int, decimal>();
            void AddCout(IEnumerable<(int? machine, decimal montant)> rows)
            {
                foreach (var (m, montant) in rows)
                    if (m.HasValue) coutMachine[m.Value] = coutMachine.GetValueOrDefault(m.Value) + montant;
            }
            AddCout((await TempsQ(from, to).Select(t => new { t.DemandeIntervention.IDEquipement, M = t.DureeMinutes * (t.TauxHoraire ?? t.Technicien.TauxHoraire ?? 0) / 60m }).ToListAsync())
                .Select(x => (x.IDEquipement, x.M)));
            AddCout((await PiecesQ(from, to).Select(p => new { p.DemandeIntervention.IDEquipement, M = p.Quantite * p.PrixUnitaire }).ToListAsync())
                .Select(x => (x.IDEquipement, x.M)));
            AddCout((await ExterneQ(from, to).Select(d => new { d.IDEquipement, M = d.CoutExterne ?? 0 }).ToListAsync())
                .Select(x => (x.IDEquipement, x.M)));

            // Budget for the period, and the year-end projection: annual budgets prorated by days
            // (plant-wide budgets, or the line's own when the dashboard is narrowed to a line)
            decimal budget = 0, budgetAnnuel = 0;
            decimal? projection = null;
            if (!equipementId.HasValue)
            {
                var years = await _context.Budgets.AsNoTracking()
                    .Where(b => b.Annee >= from.Year && b.Annee <= today.Year &&
                                (chaineId.HasValue ? b.IdChaineProduction == chaineId : b.IdChaineProduction == null))
                    .GroupBy(b => b.Annee).Select(g => new { Annee = g.Key, Montant = g.Sum(b => b.Montant) }).ToListAsync();
                budget = KpiCalculator.BudgetProrata(years.Select(y => (y.Annee, y.Montant)), from, to);
                budgetAnnuel = years.Where(y => y.Annee == today.Year).Sum(y => y.Montant);
                if (budgetAnnuel > 0)
                {
                    var ytd = await CostAsync(new DateTime(today.Year, 1, 1), now);
                    projection = KpiCalculator.ProjectionFinAnnee(ytd.mo + ytd.pieces + ytd.ext, KpiCalculator.FractionAnneeEcoulee(today.Year, today));
                }
            }

            // Preventive share of labour hours
            var tHours = await TempsQ(from, to)
                .GroupBy(t => t.DemandeIntervention.IdPlanPreventif != null)
                .Select(g => new { Preventif = g.Key, Minutes = g.Sum(t => t.DureeMinutes) })
                .ToListAsync();
            var minPrev = tHours.Where(x => x.Preventif).Sum(x => x.Minutes);
            var minAll = tHours.Sum(x => x.Minutes);

            // Trend buckets: days for short periods (and months), weeks for a quarter, months for a year
            var buckets = new List<(string label, DateTime start, DateTime end)>();
            if (days <= 30 || !string.IsNullOrEmpty(mois))
                for (var d = from; d < to; d = d.AddDays(1)) buckets.Add((d.ToString("dd/MM"), d, d.AddDays(1)));
            else if (days == 90)
            {
                var start = from.AddDays(-(((int)from.DayOfWeek + 6) % 7));
                for (var d = start; d < to; d = d.AddDays(7)) buckets.Add(($"S{System.Globalization.ISOWeek.GetWeekOfYear(d)}", d, d.AddDays(7)));
            }
            else
            {
                var start = new DateTime(from.Year, from.Month, 1);
                for (var d = start; d < to; d = d.AddMonths(1)) buckets.Add((d.ToString("MMM yy", Fr).Replace(".", ""), d, d.AddMonths(1)));
            }
            var tendance = buckets.Select(b => new
            {
                label = b.label,
                declarees = valid.Count(o => o.Created >= b.start && o.Created < b.end),
                realisees = valid.Count(o => o.Done >= b.start && o.Done < b.end),
                arret = Math.Round(Heures(b.start, b.end).Sum(), 1)
            }).ToList();

            // Downtime of the period attributed to each stop (overlaps on a machine counted once)
            var heuresCur = Heures(from, to);
            var stopsCur = arrets.Select((o, i) => (o, h: heuresCur[i])).Where(x => x.h > 0 || (x.o.Created >= from && x.o.Created < to)).ToList();
            var totalArret = stopsCur.Sum(x => x.h);
            var parChaine = stopsCur.GroupBy(x => new { x.o.Chaine, x.o.ChaineLib })
                .Select(g => new { id = g.Key.Chaine, chaine = g.Key.ChaineLib, heures = Math.Round(g.Sum(x => x.h), 1), pannes = g.Count(x => x.o.Created >= from) })
                .OrderByDescending(x => x.heures).ToList();

            var causes = stopsCur.Where(x => x.o.Created >= from).GroupBy(x => new { x.o.PanneId, x.o.Panne })
                .Select(g => new { panneId = g.Key.PanneId, panne = g.Key.Panne, nombre = g.Count(), heures = Math.Round(g.Sum(x => x.h), 1) })
                .OrderByDescending(x => x.nombre).ThenByDescending(x => x.heures).ToList();
            var totalCauses = causes.Sum(c => c.nombre);
            var cumulCauses = 0;
            var pareto = causes.Take(8).Select(c =>
            {
                cumulCauses += c.nombre;
                return new { c.panneId, c.panne, c.nombre, c.heures, part = KpiCalculator.Taux(c.nombre, totalCauses), cumul = KpiCalculator.Taux(cumulCauses, totalCauses) };
            }).ToList();

            var parMachine = stopsCur.GroupBy(x => new { x.o.Machine, x.o.MachineCode, x.o.MachineLib, x.o.ChaineLib })
                .Select(g => new
                {
                    id = g.Key.Machine!.Value, code = g.Key.MachineCode ?? "", designation = g.Key.MachineLib ?? "", chaine = g.Key.ChaineLib,
                    pannes = g.Count(x => x.o.Created >= from), heures = Math.Round(g.Sum(x => x.h), 1),
                    cout = Math.Round(coutMachine.GetValueOrDefault(g.Key.Machine!.Value), 3)
                })
                .OrderByDescending(x => x.heures).ThenByDescending(x => x.pannes).ToList();
            var cumulMachines = 0.0;
            var topMachines = parMachine.Take(8).Select(m =>
            {
                cumulMachines += m.heures;
                return new { m.id, m.code, m.designation, m.chaine, m.pannes, m.heures, m.cout,
                    part = totalArret > 0 ? Math.Round(100 * m.heures / totalArret, 1) : (double?)null,
                    cumul = totalArret > 0 ? Math.Round(100 * cumulMachines / totalArret, 1) : (double?)null };
            }).ToList();

            // Machines that cost the most, stopped or not (preventive included)
            var machineNoms = await _context.Equipments.AsNoTracking()
                .Where(e => coutMachine.Keys.Contains(e.IdEquipement))
                .Select(e => new { e.IdEquipement, e.CodeEquipement, e.Designation, Chaine = e.ChaineProduction != null ? e.ChaineProduction.Libelle : null })
                .ToListAsync();
            var coutParMachine = coutMachine.OrderByDescending(x => x.Value).Take(8)
                .Select(x =>
                {
                    var m = machineNoms.FirstOrDefault(n => n.IdEquipement == x.Key);
                    return new { id = x.Key, code = m?.CodeEquipement ?? "", designation = m?.Designation ?? "", chaine = m?.Chaine, cout = Math.Round(x.Value, 3) };
                }).ToList();

            // Alerts across modules
            var alertes = new
            {
                machinesArretees = open.Where(o => o.IsArret).Select(o => o.Machine).Distinct().Count(),
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
                    rank = o.IsArret ? 0 : Overdue(o) ? 1 : o.Tech == null ? 2 : 3,
                    raison = o.IsArret ? "Machine à l'arrêt" : o.Plan.HasValue && o.Planned < today ? "Préventif en retard" : o.Tech == null ? "Non affectée" : "En attente"
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

            var cur = current;
            var prev = previous;
            var aRetenir = SyntheseRegles.Construire(new SyntheseEntree
            {
                Periode = libelle,
                PeriodePrecedente = libellePrec.StartsWith("en ") ? libellePrec : "sur " + libellePrec,
                HeuresArret = cur.HeuresArret,
                HeuresArretPrecedent = prev.HeuresArret,
                Mttr = cur.Mttr,
                MttrPrecedent = prev.Mttr,
                RespectPreventif = cur.RespectPreventif,
                PreventifsDus = cur.PreventifsDus,
                PreventifsEnRetard = alertes.preventifsEnRetard,
                Machines = parMachine.Select(m => new MachineArret(m.id, m.code, m.designation, m.heures)).ToList(),
                Chaines = parChaine.Select(c => new ChaineArret(c.id, c.chaine, c.heures)).ToList(),
                Causes = causes.Select(c => new CausePanne(c.panne, c.nombre)).ToList(),
                Pannes = cur.Pannes,
                Cout = cost.mo + cost.pieces + cost.ext,
                BudgetPeriode = budget,
                ProjectionAnnuelle = string.IsNullOrEmpty(mois) ? projection : null,
                BudgetAnnuel = budgetAnnuel,
                MachinesArretees = string.IsNullOrEmpty(mois) ? alertes.machinesArretees : 0,
                NonAffectees = string.IsNullOrEmpty(mois) ? alertes.nonAffectees : 0,
                StockRupture = string.IsNullOrEmpty(mois) ? alertes.stockRupture : 0,
                FiltreChaine = chaineId.HasValue,
                FiltreMachine = equipementId.HasValue
            });

            return Ok(new
            {
                periode = new { from, to, days, machines, mois, libelle, libellePrecedent = libellePrec, precedentFrom = prevFrom, precedentTo = prevTo },
                courant = current,
                precedent = previous,
                backlog = open.Count,
                enRetard = overdue.Count,
                cout = new { mainOeuvre = cost.mo, pieces = cost.pieces, externe = cost.ext, total = cost.mo + cost.pieces + cost.ext },
                coutPrecedent = costPrev.mo + costPrev.pieces + costPrev.ext,
                budgetPeriode = budget,
                budgetAnnuel,
                projectionAnnuelle = projection,
                partPreventif = minAll > 0 ? Math.Round(100.0 * minPrev / minAll, 1) : (double?)null,
                heuresSaisies = Math.Round(minAll / 60.0, 1),
                tendance,
                parChaine,
                pareto,
                topMachines,
                coutParMachine,
                alertes,
                aTraiter,
                aRetenir
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
                ? await _context.InterventionTemps.Where(t => t.IdTechnicien == user.Id && t.DemandeIntervention.IsActif && t.Debut >= weekStart).SumAsync(t => (int?)t.DureeMinutes) ?? 0
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
