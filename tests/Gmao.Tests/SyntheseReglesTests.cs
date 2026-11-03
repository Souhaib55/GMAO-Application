using API.Services.Kpi;
using Xunit;

namespace Gmao.Tests;

/// <summary>Rules of the "À retenir" block at the top of the dashboard.</summary>
public class SyntheseReglesTests
{
    private static SyntheseEntree Base => new() { Periode = "ces 30 jours", PeriodePrecedente = "sur les 30 jours précédents" };

    [Fact]
    public void Rien_a_signaler()
    {
        var points = SyntheseRegles.Construire(Base);
        Assert.Single(points);
        Assert.Equal(SyntheseRegles.Bien, points[0].Niveau);
        Assert.Contains("Rien d'anormal", points[0].Texte);
    }

    [Fact]
    public void Trois_machines_concentrent_les_arrets()
    {
        var e = Base with
        {
            Machines = new[]
            {
                new MachineArret(4, "CB-04", "Piqueuse", 30), new MachineArret(1, "CB-01", "Piqueuse", 20),
                new MachineArret(2, "CA-02", "Piqueuse", 10), new MachineArret(7, "RE-04", "Presse", 5), new MachineArret(8, "CP-01", "Table", 5)
            }
        };
        var p = Assert.Single(SyntheseRegles.Construire(e), x => x.Texte.Contains("machines cumulent"));
        // (30 + 20 + 10) ÷ 70 = 85,7 % → 86 %
        Assert.Equal("3 machines cumulent 86 % des heures d'arrêt de ces 30 jours (CB-04, CB-01, CA-02).", p.Texte);
        Assert.Equal("/equipment/view/4", p.Lien);
    }

    [Fact]
    public void Une_machine_seule_pese_lourd()
    {
        var e = Base with { Machines = new[] { new MachineArret(4, "CB-04", "Piqueuse", 8), new MachineArret(1, "CB-01", "Piqueuse", 2) } };
        Assert.Contains(SyntheseRegles.Construire(e), x => x.Texte.StartsWith("La machine CB-04 représente à elle seule 80 %"));
    }

    [Fact]
    public void Arrets_disperses_ne_declenchent_pas_la_regle()
    {
        var machines = Enumerable.Range(1, 10).Select(i => new MachineArret(i, $"M-{i}", "Machine", 5)).ToList();
        Assert.DoesNotContain(SyntheseRegles.Construire(Base with { Machines = machines }), x => x.Texte.Contains("cumulent") || x.Texte.Contains("à elle seule"));
    }

    [Fact]
    public void Chaine_la_plus_touchee_sauf_si_le_tableau_est_deja_filtre()
    {
        var chaines = new[] { new ChaineArret(3, "Couture B", 30), new ChaineArret(2, "Couture A", 12), new ChaineArret(1, "Coupe", 10) };
        var points = SyntheseRegles.Construire(Base with { Chaines = chaines });
        var p = Assert.Single(points, x => x.Texte.Contains("Couture B"));
        Assert.Equal("La chaîne Couture B concentre 58 % des heures d'arrêt (30 h).", p.Texte);
        Assert.Equal("3", p.Parametres!["chaineId"]);
        Assert.DoesNotContain(SyntheseRegles.Construire(Base with { Chaines = chaines, FiltreChaine = true }), x => x.Texte.Contains("Couture B"));
    }

    [Fact]
    public void Premiere_cause_de_panne()
    {
        var causes = new[] { new CausePanne("Panne électrique", 6), new CausePanne("Panne mécanique", 6), new CausePanne("Casse aiguille", 2), new CausePanne("Tension du fil", 2) };
        var p = Assert.Single(SyntheseRegles.Construire(Base with { Causes = causes }), x => x.Texte.Contains("première cause"));
        Assert.Equal("« Panne électrique » est la première cause de panne : 6 sur 16 (38 %).", p.Texte);
    }

    [Fact]
    public void Hausse_des_arrets_avec_le_pourcentage()
    {
        var p = Assert.Single(SyntheseRegles.Construire(Base with { HeuresArret = 61, HeuresArretPrecedent = 43 }), x => x.Texte.Contains("augmentent"));
        Assert.Equal("Les heures d'arrêt augmentent : 61 h contre 43 h sur les 30 jours précédents (+42 %).", p.Texte);
        Assert.Equal(SyntheseRegles.Attention, p.Niveau);
    }

    [Fact]
    public void Petite_variation_des_arrets_ignoree()
    {
        // +1 h is noise, not a trend
        Assert.DoesNotContain(SyntheseRegles.Construire(Base with { HeuresArret = 4, HeuresArretPrecedent = 3 }), x => x.Texte.Contains("arrêt augmentent"));
    }

    [Fact]
    public void Preventif_sous_l_objectif()
    {
        var points = SyntheseRegles.Construire(Base with { RespectPreventif = 80, PreventifsDus = 49, PreventifsEnRetard = 2 });
        var p = Assert.Single(points, x => x.Texte.StartsWith("Respect du préventif"));
        Assert.Equal("Respect du préventif : 80 % (objectif 90 %), 2 préventifs en retard.", p.Texte);
        Assert.Equal(SyntheseRegles.Attention, p.Niveau);
        Assert.Equal(SyntheseRegles.Grave, SyntheseRegles.Construire(Base with { RespectPreventif = 60, PreventifsDus = 10 })[0].Niveau);
    }

    [Fact]
    public void Depassement_previsible_du_budget()
    {
        var p = Assert.Single(SyntheseRegles.Construire(Base with { ProjectionAnnuelle = 37735m, BudgetAnnuel = 34000m }), x => x.Lien == "/budgets");
        Assert.Equal("Au rythme actuel, le budget annuel (34 000 DT) sera dépassé d'environ 3 735 DT en fin d'année.", p.Texte);
    }

    [Fact]
    public void Urgences_en_premier_et_cinq_points_au_plus()
    {
        var e = Base with
        {
            MachinesArretees = 1, NonAffectees = 2, StockRupture = 1,
            RespectPreventif = 80, PreventifsDus = 10, PreventifsEnRetard = 2,
            HeuresArret = 61, HeuresArretPrecedent = 43,
            ProjectionAnnuelle = 40000m, BudgetAnnuel = 34000m,
            Causes = new[] { new CausePanne("Panne électrique", 6), new CausePanne("Autre", 4) }
        };
        var points = SyntheseRegles.Construire(e);
        Assert.Equal(SyntheseRegles.MaxPoints, points.Count);
        Assert.Equal("1 machine est à l'arrêt en ce moment.", points[0].Texte);
        Assert.Equal(SyntheseRegles.Grave, points[0].Niveau);
        Assert.All(points.Skip(1), x => Assert.NotEqual(SyntheseRegles.Grave, x.Niveau));
    }

    [Fact]
    public void Montants_et_heures_au_format_francais()
    {
        Assert.Equal("34 000 DT", SyntheseRegles.Dt(34000m));
        Assert.Equal("1,6 h", SyntheseRegles.H(1.6));
        Assert.Equal("61 h", SyntheseRegles.H(61.4));
        Assert.Equal("86 %", SyntheseRegles.Pct(85.7));
    }
}
