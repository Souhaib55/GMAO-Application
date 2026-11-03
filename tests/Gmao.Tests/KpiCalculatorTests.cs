using API.Controllers;
using API.Services.Kpi;
using Xunit;

namespace Gmao.Tests;

/// <summary>
/// Every indicator of the dashboard, checked against a calculation done by hand.
/// Dates are local times of the factory (the server runs on Tunis time).
/// </summary>
public class KpiCalculatorTests
{
    private static readonly DateTime Jour = new(2026, 10, 15);
    private static DateTime H(double heure) => Jour.AddHours(heure);
    private static readonly DateTime From = Jour;
    private static readonly DateTime To = Jour.AddDays(1);

    // ------------------------------------------------------------------ downtime

    [Fact]
    public void Arret_simple_dans_la_periode()
    {
        var arrets = new[] { new ArretMachine(1, H(10), H(14)) };
        Assert.Equal(4, KpiCalculator.HeuresArret(arrets, From, To, To), 6);
    }

    [Fact]
    public void Deux_demandes_qui_se_chevauchent_sur_la_meme_machine_comptent_une_fois()
    {
        // 08:00–12:00 and 10:00–14:00 on the same machine: the machine was stopped 6 h, not 8 h
        var arrets = new[] { new ArretMachine(1, H(8), H(12)), new ArretMachine(1, H(10), H(14)) };
        var parDemande = KpiCalculator.AttribuerHeuresArret(arrets, From, To, To);
        Assert.Equal(4, parDemande[0], 6);   // the first declared keeps the shared hours
        Assert.Equal(2, parDemande[1], 6);
        Assert.Equal(6, parDemande.Sum(), 6);
    }

    [Fact]
    public void Memes_horaires_sur_deux_machines_differentes_s_additionnent()
    {
        var arrets = new[] { new ArretMachine(1, H(8), H(12)), new ArretMachine(2, H(10), H(14)) };
        Assert.Equal(8, KpiCalculator.HeuresArret(arrets, From, To, To), 6);
    }

    [Fact]
    public void Demande_incluse_dans_une_autre_n_ajoute_rien()
    {
        var arrets = new[] { new ArretMachine(1, H(8), H(18)), new ArretMachine(1, H(10), H(12)) };
        var parDemande = KpiCalculator.AttribuerHeuresArret(arrets, From, To, To);
        Assert.Equal(10, parDemande[0], 6);
        Assert.Equal(0, parDemande[1], 6);
    }

    [Fact]
    public void L_ordre_de_la_liste_ne_change_pas_le_total()
    {
        var a = new ArretMachine(1, H(8), H(12));
        var b = new ArretMachine(1, H(10), H(14));
        var c = new ArretMachine(1, H(13), H(15));
        Assert.Equal(7, KpiCalculator.HeuresArret(new[] { a, b, c }, From, To, To), 6);
        Assert.Equal(7, KpiCalculator.HeuresArret(new[] { c, b, a }, From, To, To), 6);
    }

    [Fact]
    public void Arrets_successifs_sans_chevauchement()
    {
        var arrets = new[] { new ArretMachine(1, H(8), H(10)), new ArretMachine(1, H(11), H(12)) };
        Assert.Equal(3, KpiCalculator.HeuresArret(arrets, From, To, To), 6);
    }

    [Fact]
    public void Arret_commence_avant_la_periode_est_coupe_au_debut()
    {
        // Declared the day before at 20:00, repaired at 06:00: 6 h fall in the period
        var arrets = new[] { new ArretMachine(1, H(-4), H(6)) };
        Assert.Equal(6, KpiCalculator.HeuresArret(arrets, From, To, To), 6);
    }

    [Fact]
    public void Arret_en_cours_compte_jusqu_a_maintenant()
    {
        var arrets = new[] { new ArretMachine(1, H(13), null) };
        Assert.Equal(2, KpiCalculator.HeuresArret(arrets, From, To, now: H(15)), 6);
    }

    [Fact]
    public void Arret_en_cours_est_coupe_a_la_fin_de_la_periode()
    {
        // Previous period [day−1, day): an open stop since 22:00 the day before counts 2 h there
        var arrets = new[] { new ArretMachine(1, H(-2), null) };
        Assert.Equal(2, KpiCalculator.HeuresArret(arrets, From.AddDays(-1), From, now: H(15)), 6);
    }

    // ------------------------------------------------------------------ indicators

    [Fact]
    public void Disponibilite_exemple_du_tableau_de_bord()
    {
        // 26 machines over 30 days (720 h): 18 720 machine-hours, 61 h of downtime
        // 1 − 61 ÷ 18 720 = 99,67 % → 99,7 %
        Assert.Equal(99.7, KpiCalculator.Disponibilite(61, 26, 720));
    }

    [Fact]
    public void Disponibilite_reste_entre_0_et_100()
    {
        Assert.Equal(0, KpiCalculator.Disponibilite(1000, 1, 24));
        Assert.Equal(100, KpiCalculator.Disponibilite(0, 26, 720));
    }

    [Fact]
    public void Mtbf_exemple()
    {
        // (26 × 720 − 61) ÷ 18 breakdowns = 18 659 ÷ 18 = 1 036,6 → 1 037 h
        Assert.Equal(1037, KpiCalculator.Mtbf(26, 720, 61, 18));
        Assert.Null(KpiCalculator.Mtbf(26, 720, 0, 0));
    }

    [Fact]
    public void Mttr_moyenne_des_reparations()
    {
        // 1 h, 2 h and 3 h of repair: 6 h ÷ 3 repairs = 2 h
        var reparations = new[] { (H(8), H(9)), (H(10), H(12)), (H(13), H(16)) };
        Assert.Equal(2.0, KpiCalculator.Mttr(reparations));
    }

    [Fact]
    public void Mttr_ignore_les_dates_incoherentes_et_vaut_null_sans_reparation()
    {
        Assert.Equal(1.0, KpiCalculator.Mttr(new[] { (H(8), H(9)), (H(12), H(10)) }));
        Assert.Null(KpiCalculator.Mttr(Array.Empty<(DateTime, DateTime)>()));
    }

    [Fact]
    public void Respect_du_preventif()
    {
        // 40 jobs done within the tolerance out of 49 due: 81,6 %
        Assert.Equal(81.6, KpiCalculator.Taux(40, 49));
        Assert.Null(KpiCalculator.Taux(0, 0));
    }

    [Fact]
    public void Periode_precedente_de_meme_duree()
    {
        var from = new DateTime(2026, 10, 5);
        var to = new DateTime(2026, 11, 3, 20, 30, 0);
        var (pf, pt) = KpiCalculator.PeriodePrecedente(from, to);
        Assert.Equal(from, pt);
        Assert.Equal(to - from, pt - pf);
    }

    [Fact]
    public void Periodes_du_tableau_de_bord_sur_30_jours()
    {
        var now = new DateTime(2026, 11, 3, 20, 30, 0);
        var p = PilotageController.Periodes(30, null, now);
        Assert.Equal(new DateTime(2026, 10, 5), p.from);
        Assert.Equal(now, p.to);
        Assert.Equal(p.to - p.from, p.prevTo - p.prevFrom);   // same length: no built-in bias of the comparison
        Assert.Equal("ces 30 jours", p.libelle);
    }

    [Fact]
    public void Periodes_du_rapport_mensuel()
    {
        var now = new DateTime(2026, 11, 3, 20, 30, 0);
        var p = PilotageController.Periodes(30, "2026-10", now);
        Assert.Equal(new DateTime(2026, 10, 1), p.from);
        Assert.Equal(new DateTime(2026, 11, 1), p.to);
        Assert.Equal(new DateTime(2026, 9, 1), p.prevFrom);
        Assert.Equal(new DateTime(2026, 10, 1), p.prevTo);
        Assert.Equal("octobre 2026", p.libelle);

        // Current month: up to now only
        var enCours = PilotageController.Periodes(30, "2026-11", now);
        Assert.Equal(now, enCours.to);
    }

    // ------------------------------------------------------------------ money

    [Fact]
    public void Cout_main_d_oeuvre()
    {
        // 90 minutes at 12 DT/h = 18 DT
        Assert.Equal(18m, KpiCalculator.CoutMainOeuvre(90, 12m));
        Assert.Equal(0m, KpiCalculator.CoutMainOeuvre(90, null));
    }

    [Fact]
    public void Budget_au_prorata_des_jours()
    {
        // 36 500 DT for 2026 (365 days): 100 DT a day, January 1–31 = 30 days → 3 000 DT
        Assert.Equal(3000m, KpiCalculator.BudgetProrata(new[] { (2026, 36500m) }, new DateTime(2026, 1, 1), new DateTime(2026, 1, 31)));
    }

    [Fact]
    public void Budget_au_prorata_a_cheval_sur_deux_annees()
    {
        // 10 days of 2025 at 100 DT + 10 days of 2026 at 200 DT
        var budgets = new[] { (2025, 36500m), (2026, 73000m) };
        Assert.Equal(3000m, KpiCalculator.BudgetProrata(budgets, new DateTime(2025, 12, 22), new DateTime(2026, 1, 11)));
    }

    [Fact]
    public void Projection_de_fin_d_annee()
    {
        // 3 November 2026 = day 307 of 365: 26 693 DT spent → 26 693 ÷ (307 ÷ 365) ≈ 31 736 DT
        var fraction = KpiCalculator.FractionAnneeEcoulee(2026, new DateTime(2026, 11, 3));
        Assert.Equal(307m / 365m, fraction);
        var projection = KpiCalculator.ProjectionFinAnnee(26693m, fraction);
        Assert.NotNull(projection);
        Assert.InRange(projection!.Value, 31735m, 31737m);
        Assert.Equal(1m, KpiCalculator.FractionAnneeEcoulee(2025, new DateTime(2026, 11, 3)));
        Assert.Null(KpiCalculator.ProjectionFinAnnee(100m, 0m));
    }

    [Fact]
    public void Variation_en_pourcentage()
    {
        Assert.Equal(41.9, KpiCalculator.Variation(61, 43));
        Assert.Equal(-10, KpiCalculator.Variation(90, 100));
        Assert.Null(KpiCalculator.Variation(5, 0));
        Assert.Null(KpiCalculator.Variation(null, 3));
    }
}
