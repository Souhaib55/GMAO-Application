namespace API.Services.Kpi
{
    /// <summary>A request that stopped an identified machine, from declaration to completion (open if not done).</summary>
    public sealed record ArretMachine(int MachineId, DateTime Debut, DateTime? Fin);

    /// <summary>
    /// The maintenance indicators, in one place, so that the dashboard, the machine record,
    /// the monthly report and /api/kpi give the same figure for the same word.
    /// Pure functions: no database, covered by tests/Gmao.Tests.
    ///
    /// Definitions (hours unless stated):
    ///  - downtime: union, per machine, of the periods during which at least one request kept it
    ///    stopped, clipped to the period. Two overlapping requests on the same machine count once.
    ///  - availability = 1 − downtime ÷ (machines × hours of the period), in %
    ///  - MTBF = (machines × hours − downtime) ÷ breakdowns declared in the period
    ///  - MTTR = total repair time ÷ number of repairs, repair time = completion − start of work
    ///  - preventive compliance = jobs done within the tolerance ÷ jobs due, in %
    ///  - previous period = the period of the same length just before the current one
    /// </summary>
    public static class KpiCalculator
    {
        /// <summary>
        /// Downtime hours of each stop, in the same order, so that any grouping (machine, line,
        /// cause, day) adds up to the machine-level union: when two stops of a machine overlap,
        /// the shared hours go to the one declared first.
        /// </summary>
        public static double[] AttribuerHeuresArret(IReadOnlyList<ArretMachine> arrets, DateTime from, DateTime to, DateTime now)
        {
            var result = new double[arrets.Count];
            foreach (var machine in Enumerable.Range(0, arrets.Count).GroupBy(i => arrets[i].MachineId))
            {
                var couvertJusqua = DateTime.MinValue;
                foreach (var i in machine.OrderBy(i => arrets[i].Debut).ThenBy(i => i))
                {
                    var a = arrets[i];
                    var debut = a.Debut < from ? from : a.Debut;
                    var fin = a.Fin ?? now;
                    if (fin > to) fin = to;
                    if (debut < couvertJusqua) debut = couvertJusqua;
                    if (fin > debut) result[i] = (fin - debut).TotalHours;
                    if (fin > couvertJusqua) couvertJusqua = fin;
                }
            }
            return result;
        }

        /// <summary>Total downtime of the period (machine-level union).</summary>
        public static double HeuresArret(IReadOnlyList<ArretMachine> arrets, DateTime from, DateTime to, DateTime now) =>
            AttribuerHeuresArret(arrets, from, to, now).Sum();

        /// <summary>Availability in % (0–100), one decimal.</summary>
        public static double Disponibilite(double heuresArret, int machines, double heuresPeriode)
        {
            var ouverture = Math.Max(1, machines) * heuresPeriode;
            if (ouverture <= 0) return 100;
            return Math.Round(Math.Clamp(100 * (1 - heuresArret / ouverture), 0, 100), 1);
        }

        /// <summary>Mean time between failures, whole hours; null without breakdown.</summary>
        public static double? Mtbf(int machines, double heuresPeriode, double heuresArret, int pannes) =>
            pannes > 0 ? Math.Round(Math.Max(0, Math.Max(1, machines) * heuresPeriode - heuresArret) / pannes, 0) : null;

        /// <summary>Mean time to repair, one decimal; repairs ending before they start are ignored.</summary>
        public static double? Mttr(IEnumerable<(DateTime debut, DateTime fin)> reparations)
        {
            var durees = reparations.Where(r => r.fin >= r.debut).Select(r => (r.fin - r.debut).TotalHours).ToList();
            return durees.Count > 0 ? Math.Round(durees.Average(), 1) : null;
        }

        /// <summary>Share in %, one decimal; null when nothing was due.</summary>
        public static double? Taux(int numerateur, int denominateur) =>
            denominateur > 0 ? Math.Round(100.0 * numerateur / denominateur, 1) : null;

        /// <summary>The period of the same length just before [from, to).</summary>
        public static (DateTime from, DateTime to) PeriodePrecedente(DateTime from, DateTime to) => (from - (to - from), from);

        /// <summary>Labour cost of a time entry, in DT: minutes × hourly rate ÷ 60.</summary>
        public static decimal CoutMainOeuvre(int minutes, decimal? tauxHoraire) => minutes * (tauxHoraire ?? 0) / 60m;

        /// <summary>Annual budgets prorated by days over [from, to).</summary>
        public static decimal BudgetProrata(IEnumerable<(int annee, decimal montant)> budgetsAnnuels, DateTime from, DateTime to)
        {
            decimal total = 0;
            foreach (var (annee, montant) in budgetsAnnuels)
            {
                var debut = new DateTime(annee, 1, 1);
                var fin = debut.AddYears(1);
                var jours = ((to < fin ? to : fin) - (from > debut ? from : debut)).TotalDays;
                if (jours > 0) total += montant * (decimal)(jours / (fin - debut).TotalDays);
            }
            return Math.Round(total, 3);
        }

        /// <summary>Share of the year elapsed at the end of <paramref name="jour"/>, by days (0–1).</summary>
        public static decimal FractionAnneeEcoulee(int annee, DateTime jour)
        {
            if (annee < jour.Year) return 1m;
            if (annee > jour.Year) return 0m;
            return (decimal)jour.DayOfYear / (DateTime.IsLeapYear(annee) ? 366 : 365);
        }

        /// <summary>Year-end spend if the current pace continues; null at the very start of the year.</summary>
        public static decimal? ProjectionFinAnnee(decimal depenseADate, decimal fractionEcoulee) =>
            fractionEcoulee > 0 ? Math.Round(depenseADate / fractionEcoulee, 3) : null;

        /// <summary>Relative change in %, null when there is no meaningful base.</summary>
        public static double? Variation(double? courant, double? precedent) =>
            courant.HasValue && precedent.HasValue && precedent.Value != 0
                ? Math.Round(100 * (courant.Value - precedent.Value) / Math.Abs(precedent.Value), 1)
                : null;
    }
}
