using System.Globalization;

namespace API.Services.Kpi
{
    public sealed record MachineArret(int Id, string Code, string Libelle, double Heures);
    public sealed record ChaineArret(int Id, string Libelle, double Heures);
    public sealed record CausePanne(string Libelle, int Nombre);

    /// <summary>Figures of the period the summary rules look at.</summary>
    public sealed record SyntheseEntree
    {
        public string Periode { get; init; } = "la période";              // "ces 30 jours", "octobre 2026"
        public string PeriodePrecedente { get; init; } = "la période précédente";
        public double HeuresArret { get; init; }
        public double HeuresArretPrecedent { get; init; }
        public double? Mttr { get; init; }
        public double? MttrPrecedent { get; init; }
        public double? RespectPreventif { get; init; }
        public int PreventifsDus { get; init; }
        public int PreventifsEnRetard { get; init; }
        public IReadOnlyList<MachineArret> Machines { get; init; } = Array.Empty<MachineArret>();   // every machine with downtime, any order
        public IReadOnlyList<ChaineArret> Chaines { get; init; } = Array.Empty<ChaineArret>();
        public IReadOnlyList<CausePanne> Causes { get; init; } = Array.Empty<CausePanne>();
        public int Pannes { get; init; }
        public decimal Cout { get; init; }
        public decimal BudgetPeriode { get; init; }
        public decimal? ProjectionAnnuelle { get; init; }
        public decimal BudgetAnnuel { get; init; }
        public int MachinesArretees { get; init; }
        public int NonAffectees { get; init; }
        public int StockRupture { get; init; }
        public bool FiltreChaine { get; init; }
        public bool FiltreMachine { get; init; }
    }

    /// <summary>One line of "À retenir": what is happening, then what to do, with where to do it.</summary>
    public sealed record PointSynthese(string Niveau, string Texte, string Action, string? Lien, IReadOnlyDictionary<string, string>? Parametres = null);

    /// <summary>
    /// "À retenir / Que faire ?" at the top of the dashboard. Plain rules, no AI: each rule
    /// looks at one figure, fires above a threshold that matters for a garment workshop, and
    /// says what to do next. At most <see cref="MaxPoints"/> lines, the most serious first.
    /// </summary>
    public static class SyntheseRegles
    {
        public const int MaxPoints = 5;
        public const double ObjectifPreventif = 90;
        private static readonly CultureInfo Fr = CultureInfo.GetCultureInfo("fr-FR");

        public const string Grave = "bad";
        public const string Attention = "warn";
        public const string Bien = "ok";
        public const string Info = "info";

        private static int Rang(string niveau) => niveau switch { Grave => 0, Attention => 1, Info => 2, _ => 3 };

        public static string H(double heures) => heures < 10 ? heures.ToString("0.#", Fr) + " h" : Math.Round(heures).ToString("0", Fr) + " h";
        public static string Pct(double pct) => Math.Round(pct).ToString("0", Fr) + " %";
        public static string Dt(decimal montant) => Math.Round(montant).ToString("#,0", Fr).Replace(' ', ' ').Replace(' ', ' ') + " DT";
        private static string Pluriel(int n, string singulier, string pluriel) => n + " " + (n > 1 ? pluriel : singulier);

        public static List<PointSynthese> Construire(SyntheseEntree e)
        {
            var points = new List<PointSynthese>();

            // 1. Right now: machines stopped, requests nobody is on
            if (e.MachinesArretees > 0)
                points.Add(new PointSynthese(Grave,
                    $"{Pluriel(e.MachinesArretees, "machine est à l'arrêt", "machines sont à l'arrêt")} en ce moment.",
                    "Vérifiez qu'un technicien est sur chacune.", "/interventions", Q("vue", "arret")));
            if (e.NonAffectees > 0)
                points.Add(new PointSynthese(Attention,
                    $"{Pluriel(e.NonAffectees, "demande attend", "demandes attendent")} un technicien.",
                    "Affectez-les depuis la liste.", "/interventions", Q("vue", "non-affectees")));

            // 2. Where the downtime comes from: a few machines, one line
            var totalArret = e.Machines.Sum(m => m.Heures);
            var machines = e.Machines.Where(m => m.Heures > 0).OrderByDescending(m => m.Heures).ToList();
            if (!e.FiltreMachine && totalArret >= 1 && machines.Count >= 2)
            {
                var top = machines.Take(3).ToList();
                var part = 100 * top.Sum(m => m.Heures) / totalArret;
                if (machines.Count > top.Count && part >= 50)
                    points.Add(new PointSynthese(Attention,
                        $"{top.Count} machines cumulent {Pct(part)} des heures d'arrêt de {e.Periode} ({string.Join(", ", top.Select(m => m.Code))}).",
                        "Ouvrez leur historique : si la même panne revient, prévoyez une révision ou un contrôle préventif.",
                        $"/equipment/view/{top[0].Id}", Q("onglet", "historique")));
                else if (top[0].Heures / totalArret >= 0.4)
                    points.Add(new PointSynthese(Attention,
                        $"La machine {top[0].Code} représente à elle seule {Pct(100 * top[0].Heures / totalArret)} des heures d'arrêt de {e.Periode}.",
                        "Ouvrez son historique pour voir si la même panne revient.",
                        $"/equipment/view/{top[0].Id}", Q("onglet", "historique")));
            }
            var totalChaines = e.Chaines.Sum(c => c.Heures);
            var chaine = e.Chaines.OrderByDescending(c => c.Heures).FirstOrDefault();
            if (!e.FiltreChaine && !e.FiltreMachine && chaine != null && e.Chaines.Count >= 2 && totalChaines >= 1 && chaine.Heures / totalChaines >= 0.4)
                points.Add(new PointSynthese(Info,
                    $"La chaîne {chaine.Libelle} concentre {Pct(100 * chaine.Heures / totalChaines)} des heures d'arrêt ({H(chaine.Heures)}).",
                    "Filtrez le tableau de bord sur cette chaîne pour voir ses machines et ses causes.",
                    "/dashboard", Q("chaineId", chaine.Id.ToString(CultureInfo.InvariantCulture))));

            // 3. Main cause
            var cause = e.Causes.OrderByDescending(c => c.Nombre).FirstOrDefault();
            var totalCauses = e.Causes.Sum(c => c.Nombre);
            if (cause != null && cause.Nombre >= 3 && totalCauses > 0 && 100.0 * cause.Nombre / totalCauses >= 30)
                points.Add(new PointSynthese(Info,
                    $"« {cause.Libelle} » est la première cause de panne : {cause.Nombre} sur {totalCauses} ({Pct(100.0 * cause.Nombre / totalCauses)}).",
                    "Vérifiez les pièces d'usure concernées et ajoutez ce point aux contrôles du préventif.",
                    "/interventions", Q("vue", "pannes")));

            // 4. Trend of downtime and repair time
            if (e.HeuresArretPrecedent > 0 && e.HeuresArret - e.HeuresArretPrecedent >= 2 && e.HeuresArret >= e.HeuresArretPrecedent * 1.2)
                points.Add(new PointSynthese(Attention,
                    $"Les heures d'arrêt augmentent : {H(e.HeuresArret)} contre {H(e.HeuresArretPrecedent)} {e.PeriodePrecedente} (+{Pct(100 * (e.HeuresArret - e.HeuresArretPrecedent) / e.HeuresArretPrecedent)}).",
                    "Regardez quelles machines ont le plus d'arrêts ci-dessous.", "/interventions", Q("vue", "arrets")));
            else if (e.HeuresArretPrecedent >= 2 && e.HeuresArretPrecedent - e.HeuresArret >= 2 && e.HeuresArret <= e.HeuresArretPrecedent * 0.8)
                points.Add(new PointSynthese(Bien,
                    $"Les heures d'arrêt baissent : {H(e.HeuresArret)} contre {H(e.HeuresArretPrecedent)} {e.PeriodePrecedente}.",
                    "Continuez : le préventif porte ses fruits.", null));
            if (e.Mttr is > 0 && e.MttrPrecedent is > 0 && e.Mttr.Value >= e.MttrPrecedent.Value * 1.2 && e.Mttr.Value - e.MttrPrecedent.Value >= 0.25)
                points.Add(new PointSynthese(Attention,
                    $"Les réparations durent plus longtemps : {H(e.Mttr.Value)} en moyenne contre {H(e.MttrPrecedent.Value)} {e.PeriodePrecedente}.",
                    "Vérifiez si des interventions attendent des pièces : un article manquant allonge chaque réparation.",
                    "/magasin", Q("vue", "reappro")));

            // 5. Preventive
            if (e.RespectPreventif.HasValue && e.PreventifsDus >= 3 && e.RespectPreventif.Value < ObjectifPreventif)
                points.Add(new PointSynthese(e.RespectPreventif.Value < 75 ? Grave : Attention,
                    $"Respect du préventif : {Pct(e.RespectPreventif.Value)} (objectif {Pct(ObjectifPreventif)})"
                    + (e.PreventifsEnRetard > 0 ? $", {Pluriel(e.PreventifsEnRetard, "préventif en retard", "préventifs en retard")}." : "."),
                    "Planifiez les préventifs en retard cette semaine : chaque entretien sauté prépare une panne.",
                    "/preventif", null));
            else if (e.RespectPreventif is >= ObjectifPreventif && e.PreventifsDus >= 3)
                points.Add(new PointSynthese(Bien,
                    $"Préventif bien tenu : {Pct(e.RespectPreventif.Value)} des entretiens faits à temps.", "Rien à faire.", null));

            // 6. Money
            if (e.ProjectionAnnuelle.HasValue && e.BudgetAnnuel > 0 && e.ProjectionAnnuelle.Value > e.BudgetAnnuel * 1.02m)
                points.Add(new PointSynthese(Attention,
                    $"Au rythme actuel, le budget annuel ({Dt(e.BudgetAnnuel)}) sera dépassé d'environ {Dt(e.ProjectionAnnuelle.Value - e.BudgetAnnuel)} en fin d'année.",
                    "Ouvrez Budgets pour voir quel poste dépasse (main-d'œuvre, pièces ou sous-traitance).", "/budgets", null));
            else if (e.BudgetPeriode > 0 && e.Cout > e.BudgetPeriode * 1.1m)
                points.Add(new PointSynthese(Attention,
                    $"Le coût de {e.Periode} ({Dt(e.Cout)}) dépasse de {Pct((double)(100 * (e.Cout - e.BudgetPeriode) / e.BudgetPeriode))} le budget prévu pour cette durée.",
                    "Ouvrez Budgets pour voir quel poste dépasse.", "/budgets", null));

            // 7. Store
            if (e.StockRupture > 0)
                points.Add(new PointSynthese(Attention,
                    $"{Pluriel(e.StockRupture, "article est en rupture", "articles sont en rupture")} de stock.",
                    "Lancez le réapprovisionnement : la quantité à commander est déjà calculée.", "/magasin", Q("vue", "reappro")));

            if (points.Count == 0)
                points.Add(new PointSynthese(Bien, $"Rien d'anormal sur {e.Periode}.", "Aucune action particulière.", null));

            return points
                .Select((p, i) => (p, i))
                .OrderBy(x => Rang(x.p.Niveau)).ThenBy(x => x.i)
                .Take(MaxPoints)
                .Select(x => x.p)
                .ToList();
        }

        private static IReadOnlyDictionary<string, string> Q(string cle, string valeur) => new Dictionary<string, string> { [cle] = valeur };
    }
}
