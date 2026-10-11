namespace API.Services
{
    /// <summary>
    /// A predefined business question answered by a fixed, parameterized, read-only query.
    /// Column aliases are the French labels shown to the user; a suffix in the alias
    /// tells the UI how to format the value: "(DT)" money, "(%)" percentage, "(h)" hours.
    /// </summary>
    public sealed record ExplorateurQuestion(
        string Id,
        string Section,
        string Question,
        string Description,
        string Rendu,               // chiffre | table | barres | ligne
        string[] Parametres,        // periode, chaine, equipement, technicien, article, fournisseur, annee, top
        string Sql,
        string[]? Obligatoires = null);

    public static class ExplorateurCatalogue
    {
        public static readonly (string Id, string Libelle, string Icone)[] Sections =
        {
            ("interventions", "Interventions", "interventions"),
            ("equipements", "Équipements", "equipment"),
            ("preventif", "Préventif", "preventive"),
            ("magasin", "Magasin", "stock"),
            ("achats", "Achats", "purchase"),
            ("techniciens", "Techniciens", "users"),
            ("couts", "Coûts et budgets", "budget"),
        };

        // ------------------------------------------------------------------
        // Reusable fragments (constants, never user input)
        // ------------------------------------------------------------------

        private const string Periode = "d.DateCreation >= @debut AND d.DateCreation < @fin";
        private const string Chaine = "(@chaine IS NULL OR d.IDChaineProduction = @chaine)";
        private const string Equipement = "(@equipement IS NULL OR d.IDEquipement = @equipement)";
        private const string Technicien = "(@technicien IS NULL OR d.DestinatairesID = @technicien)";

        // Machine stop of a request, in hours, clipped to the period
        private const string Arret =
            "DATEDIFF(MINUTE, CASE WHEN d.DateCreation < @debut THEN @debut ELSE d.DateCreation END, " +
            "CASE WHEN COALESCE(d.DateRealisation, GETDATE()) > @fin THEN @fin ELSE COALESCE(d.DateRealisation, GETDATE()) END) / 60.0";
        private const string ArretDansPeriode =
            "d.MachineArretee = 1 AND d.StatusId <> 5 AND d.DateCreation < @fin AND COALESCE(d.DateRealisation, GETDATE()) > @debut";

        // Hours elapsed in the period (up to now)
        private const string HeuresPeriode = "NULLIF(DATEDIFF(MINUTE, @debut, CASE WHEN @fin > GETDATE() THEN GETDATE() ELSE @fin END), 0) / 60.0";

        private const string CoutMO = "t.DureeMinutes * COALESCE(t.TauxHoraire, ut.TauxHoraire, 0) / 60.0";

        private static readonly string[] P = { "periode" };
        private static readonly string[] PC = { "periode", "chaine" };
        private static readonly string[] PCE = { "periode", "chaine", "equipement" };

        public static readonly ExplorateurQuestion[] Questions =
        {
            // ==============================================================
            // Interventions
            // ==============================================================
            new("int-volume", "interventions",
                "Combien d'interventions ont été déclarées sur la période ?",
                "Volume total et avancement des demandes créées sur la période.",
                "chiffre", PCE, $@"
SELECT COUNT(*) AS [Déclarées],
       SUM(CASE WHEN d.StatusId IN (3,4) THEN 1 ELSE 0 END) AS [Réalisées ou clôturées],
       SUM(CASE WHEN d.StatusId IN (1,2) THEN 1 ELSE 0 END) AS [Encore ouvertes],
       SUM(CASE WHEN d.StatusId = 5 THEN 1 ELSE 0 END) AS [Annulées],
       CAST(100.0 * SUM(CASE WHEN d.StatusId IN (3,4) THEN 1 ELSE 0 END) / NULLIF(SUM(CASE WHEN d.StatusId <> 5 THEN 1 ELSE 0 END), 0) AS decimal(5,1)) AS [Taux de réalisation (%)]
FROM DemandeInterventions d
WHERE d.IsActif = 1 AND {Periode} AND {Chaine} AND {Equipement}"),

            new("int-par-statut", "interventions",
                "Comment se répartissent les interventions par statut ?",
                "Demandes créées sur la période, par statut actuel.",
                "barres", PCE, $@"
SELECT s.Statut AS [Statut], COUNT(*) AS [Interventions]
FROM DemandeInterventions d JOIN Statuses s ON s.Id = d.StatusId
WHERE d.IsActif = 1 AND {Periode} AND {Chaine} AND {Equipement}
GROUP BY s.Id, s.Statut ORDER BY s.Id"),

            new("int-par-type", "interventions",
                "Quelle est la part de chaque type d'intervention ?",
                "Correctif, préventif, dépannage… sur la période.",
                "barres", PCE, $@"
SELECT t.Libelle AS [Type], COUNT(*) AS [Interventions],
       CAST(100.0 * COUNT(*) / SUM(COUNT(*)) OVER () AS decimal(5,1)) AS [Part (%)]
FROM DemandeInterventions d JOIN TypeInterventions t ON t.IDTypeIntervention = d.IDTypeIntervention
WHERE d.IsActif = 1 AND d.StatusId <> 5 AND {Periode} AND {Chaine} AND {Equipement}
GROUP BY t.Libelle ORDER BY [Interventions] DESC"),

            new("int-par-panne", "interventions",
                "Quels types de panne reviennent le plus souvent ?",
                "Pannes ayant arrêté une machine, avec les heures d'arrêt cumulées (Pareto).",
                "barres", PCE, $@"
SELECT p.Libelle AS [Type de panne], COUNT(*) AS [Pannes],
       CAST(SUM({Arret}) AS decimal(10,1)) AS [Arrêt (h)]
FROM DemandeInterventions d JOIN Pannes p ON p.IDPanne = d.IDPanne
WHERE d.IsActif = 1 AND d.MachineArretee = 1 AND d.StatusId <> 5 AND {Periode} AND {Chaine} AND {Equipement}
GROUP BY p.Libelle ORDER BY [Pannes] DESC"),

            new("int-par-chaine", "interventions",
                "Quelle chaîne de production déclare le plus d'interventions ?",
                "Volume, pannes et heures d'arrêt par chaîne.",
                "barres", P, $@"
SELECT c.Libelle AS [Chaîne], COUNT(*) AS [Interventions],
       SUM(CASE WHEN d.MachineArretee = 1 THEN 1 ELSE 0 END) AS [Pannes]
FROM DemandeInterventions d JOIN ChaineProductions c ON c.IDChaineProduction = d.IDChaineProduction
WHERE d.IsActif = 1 AND d.StatusId <> 5 AND {Periode}
GROUP BY c.Libelle ORDER BY [Interventions] DESC"),

            new("int-par-urgence", "interventions",
                "Comment se répartissent les demandes par urgence ?",
                "Nombre de demandes et délai moyen de prise en charge par niveau d'urgence.",
                "table", PCE, $@"
SELECT u.Libelle AS [Urgence], COUNT(*) AS [Demandes],
       CAST(AVG(CASE WHEN d.DatePriseEnCharge IS NOT NULL THEN DATEDIFF(MINUTE, d.DateCreation, d.DatePriseEnCharge) / 60.0 END) AS decimal(10,1)) AS [Délai moyen de prise en charge (h)],
       CAST(MAX(CASE WHEN d.DatePriseEnCharge IS NOT NULL THEN DATEDIFF(MINUTE, d.DateCreation, d.DatePriseEnCharge) / 60.0 END) AS decimal(10,1)) AS [Délai maximum (h)]
FROM DemandeInterventions d JOIN Urgences u ON u.IDUrgence = d.IDUrgence
WHERE d.IsActif = 1 AND d.StatusId <> 5 AND {Periode} AND {Chaine} AND {Equipement}
GROUP BY u.IDUrgence, u.Libelle ORDER BY u.IDUrgence DESC"),

            new("int-ouvertes-anciennes", "interventions",
                "Quelles interventions sont ouvertes depuis le plus longtemps ?",
                "Demandes à traiter ou en cours, de la plus ancienne à la plus récente.",
                "table", new[] { "chaine", "technicien", "top" }, $@"
SELECT TOP (@top) CONCAT('INT-', RIGHT(CONCAT('0000', d.IdDemandeIntervention), 4)) AS [Référence], d.Titre AS [Intervention],
       e.Designation AS [Machine], s.Statut AS [Statut], u.Libelle AS [Urgence],
       CONCAT(tech.Prenom, ' ', tech.Nom) AS [Technicien], d.DateCreation AS [Déclarée le],
       DATEDIFF(DAY, d.DateCreation, GETDATE()) AS [Âge (jours)]
FROM DemandeInterventions d
JOIN Statuses s ON s.Id = d.StatusId
JOIN Urgences u ON u.IDUrgence = d.IDUrgence
LEFT JOIN Equipments e ON e.IdEquipement = d.IDEquipement
LEFT JOIN Users tech ON tech.ID = d.DestinatairesID
WHERE d.IsActif = 1 AND d.StatusId IN (1,2) AND {Chaine} AND {Technicien}
ORDER BY d.DateCreation"),

            new("int-non-affectees", "interventions",
                "Quelles demandes n'ont pas encore de technicien ?",
                "Demandes à traiter sans affectation, les plus urgentes en premier.",
                "table", new[] { "chaine" }, $@"
SELECT CONCAT('INT-', RIGHT(CONCAT('0000', d.IdDemandeIntervention), 4)) AS [Référence], d.Titre AS [Intervention],
       c.Libelle AS [Chaîne], e.Designation AS [Machine], u.Libelle AS [Urgence],
       CASE WHEN d.MachineArretee = 1 THEN 'Oui' ELSE 'Non' END AS [Machine arrêtée],
       d.DateCreation AS [Déclarée le], DATEDIFF(HOUR, d.DateCreation, GETDATE()) AS [Attente (h)]
FROM DemandeInterventions d
JOIN Urgences u ON u.IDUrgence = d.IDUrgence
JOIN ChaineProductions c ON c.IDChaineProduction = d.IDChaineProduction
LEFT JOIN Equipments e ON e.IdEquipement = d.IDEquipement
WHERE d.IsActif = 1 AND d.StatusId = 1 AND d.DestinatairesID IS NULL AND {Chaine}
ORDER BY d.IDUrgence DESC, d.DateCreation"),

            new("int-tendance", "interventions",
                "Comment évoluent les interventions déclarées et réalisées chaque mois ?",
                "Tendance mensuelle : demandes créées et demandes réalisées.",
                "ligne", PC, $@"
WITH mois AS (
    SELECT DATEFROMPARTS(YEAR(@debut), MONTH(@debut), 1) AS m
    UNION ALL SELECT DATEADD(MONTH, 1, m) FROM mois WHERE DATEADD(MONTH, 1, m) < @fin
)
SELECT FORMAT(mois.m, 'yyyy-MM') AS [Mois],
       (SELECT COUNT(*) FROM DemandeInterventions d WHERE d.IsActif = 1 AND d.StatusId <> 5 AND {Chaine}
           AND d.DateCreation >= mois.m AND d.DateCreation < DATEADD(MONTH, 1, mois.m)) AS [Déclarées],
       (SELECT COUNT(*) FROM DemandeInterventions d WHERE d.IsActif = 1 AND {Chaine}
           AND d.DateRealisation >= mois.m AND d.DateRealisation < DATEADD(MONTH, 1, mois.m)) AS [Réalisées]
FROM mois ORDER BY mois.m
OPTION (MAXRECURSION 400)"),

            new("int-mttr-panne", "interventions",
                "Combien de temps faut-il pour réparer chaque type de panne ?",
                "Durée moyenne de réparation (MTTR) entre la prise en charge et la fin des travaux.",
                "barres", PCE, $@"
SELECT p.Libelle AS [Type de panne], COUNT(*) AS [Réparations],
       CAST(AVG(DATEDIFF(MINUTE, d.DatePriseEnCharge, d.DateRealisation) / 60.0) AS decimal(10,1)) AS [MTTR (h)]
FROM DemandeInterventions d JOIN Pannes p ON p.IDPanne = d.IDPanne
WHERE d.IsActif = 1 AND d.MachineArretee = 1 AND d.DatePriseEnCharge IS NOT NULL AND d.DateRealisation IS NOT NULL
  AND {Periode} AND {Chaine} AND {Equipement}
GROUP BY p.Libelle ORDER BY [MTTR (h)] DESC"),

            new("int-par-demandeur", "interventions",
                "Qui déclare le plus de demandes d'intervention ?",
                "Demandes par demandeur et part de celles qui ont arrêté une machine.",
                "table", PC, $@"
SELECT CONCAT(u.Prenom, ' ', u.Nom) AS [Demandeur], COUNT(*) AS [Demandes],
       SUM(CASE WHEN d.MachineArretee = 1 THEN 1 ELSE 0 END) AS [Avec arrêt machine],
       SUM(CASE WHEN d.StatusId = 5 THEN 1 ELSE 0 END) AS [Annulées]
FROM DemandeInterventions d JOIN Users u ON u.ID = d.DemandeursID
WHERE d.IsActif = 1 AND {Periode} AND {Chaine}
GROUP BY u.Prenom, u.Nom ORDER BY [Demandes] DESC"),

            new("int-annulees", "interventions",
                "Quelles interventions ont été annulées et pourquoi ?",
                "Demandes annulées sur la période avec leur motif.",
                "table", PC, $@"
SELECT CONCAT('INT-', RIGHT(CONCAT('0000', d.IdDemandeIntervention), 4)) AS [Référence], d.Titre AS [Intervention],
       CONCAT(u.Prenom, ' ', u.Nom) AS [Demandeur], d.DateCreation AS [Déclarée le], d.RaisonAnnulation AS [Motif]
FROM DemandeInterventions d JOIN Users u ON u.ID = d.DemandeursID
WHERE d.IsActif = 1 AND d.StatusId = 5 AND {Periode} AND {Chaine}
ORDER BY d.DateCreation DESC"),

            new("int-sans-analyse", "interventions",
                "Quelles pannes réparées n'ont ni cause ni remède renseignés ?",
                "Qualité des retours d'expérience : interventions correctives à compléter.",
                "table", PC, $@"
SELECT CONCAT('INT-', RIGHT(CONCAT('0000', d.IdDemandeIntervention), 4)) AS [Référence], d.Titre AS [Intervention],
       e.Designation AS [Machine], CONCAT(t.Prenom, ' ', t.Nom) AS [Technicien], d.DateRealisation AS [Réalisée le]
FROM DemandeInterventions d
LEFT JOIN Equipments e ON e.IdEquipement = d.IDEquipement
LEFT JOIN Users t ON t.ID = d.DestinatairesID
WHERE d.IsActif = 1 AND d.MachineArretee = 1 AND d.StatusId IN (3,4) AND (d.Cause IS NULL OR d.Remede IS NULL)
  AND {Periode} AND {Chaine}
ORDER BY d.DateRealisation DESC"),

            new("int-plus-cheres", "interventions",
                "Quelles sont les interventions les plus coûteuses ?",
                "Coût complet : main-d'œuvre, pièces consommées et prestations externes.",
                "table", new[] { "periode", "chaine", "equipement", "top" }, $@"
SELECT TOP (@top) CONCAT('INT-', RIGHT(CONCAT('0000', d.IdDemandeIntervention), 4)) AS [Référence], d.Titre AS [Intervention],
       e.Designation AS [Machine],
       CAST(ISNULL(mo.Cout, 0) AS decimal(14,3)) AS [Main-d'œuvre (DT)],
       CAST(ISNULL(pc.Cout, 0) AS decimal(14,3)) AS [Pièces (DT)],
       CAST(ISNULL(d.CoutExterne, 0) AS decimal(14,3)) AS [Externe (DT)],
       CAST(ISNULL(mo.Cout, 0) + ISNULL(pc.Cout, 0) + ISNULL(d.CoutExterne, 0) AS decimal(14,3)) AS [Total (DT)]
FROM DemandeInterventions d
LEFT JOIN Equipments e ON e.IdEquipement = d.IDEquipement
OUTER APPLY (SELECT SUM({CoutMO}) AS Cout FROM InterventionTemps t JOIN Users ut ON ut.ID = t.IdTechnicien WHERE t.IdDemandeIntervention = d.IdDemandeIntervention) mo
OUTER APPLY (SELECT SUM(p.Quantite * p.PrixUnitaire) AS Cout FROM InterventionPieces p WHERE p.IdDemandeIntervention = d.IdDemandeIntervention) pc
WHERE d.IsActif = 1 AND {Periode} AND {Chaine} AND {Equipement}
ORDER BY [Total (DT)] DESC"),

            new("int-jour-semaine", "interventions",
                "Quels jours de la semaine concentrent les pannes ?",
                "Pannes avec arrêt machine selon le jour de déclaration.",
                "barres", PCE, $@"
SELECT CASE j.n WHEN 0 THEN '1 Lundi' WHEN 1 THEN '2 Mardi' WHEN 2 THEN '3 Mercredi' WHEN 3 THEN '4 Jeudi'
                WHEN 4 THEN '5 Vendredi' WHEN 5 THEN '6 Samedi' ELSE '7 Dimanche' END AS [Jour],
       COUNT(*) AS [Pannes]
FROM DemandeInterventions d
CROSS APPLY (SELECT DATEDIFF(DAY, '19000101', d.DateCreation) % 7 AS n) j
WHERE d.IsActif = 1 AND d.MachineArretee = 1 AND d.StatusId <> 5 AND {Periode} AND {Chaine} AND {Equipement}
GROUP BY j.n ORDER BY j.n"),

            new("int-heure", "interventions",
                "À quelle heure de la journée surviennent les pannes ?",
                "Pannes avec arrêt machine selon l'heure de déclaration (utile pour organiser les équipes).",
                "barres", PCE, $@"
SELECT CONCAT(RIGHT(CONCAT('0', DATEPART(HOUR, d.DateCreation)), 2), ' h') AS [Heure], COUNT(*) AS [Pannes]
FROM DemandeInterventions d
WHERE d.IsActif = 1 AND d.MachineArretee = 1 AND d.StatusId <> 5 AND {Periode} AND {Chaine} AND {Equipement}
GROUP BY DATEPART(HOUR, d.DateCreation) ORDER BY DATEPART(HOUR, d.DateCreation)"),

            // ==============================================================
            // Équipements
            // ==============================================================
            new("eq-plus-pannes", "equipements",
                "Quelles machines tombent le plus souvent en panne ?",
                "Classement des machines par nombre de pannes, avec les heures d'arrêt.",
                "table", new[] { "periode", "chaine", "top" }, $@"
SELECT TOP (@top) e.CodeEquipement AS [Code], e.Designation AS [Machine], c.Libelle AS [Chaîne],
       COUNT(*) AS [Pannes], CAST(SUM({Arret}) AS decimal(10,1)) AS [Arrêt (h)]
FROM DemandeInterventions d
JOIN Equipments e ON e.IdEquipement = d.IDEquipement
LEFT JOIN ChaineProductions c ON c.IDChaineProduction = e.IdChaineProduction
WHERE d.IsActif = 1 AND {ArretDansPeriode} AND {Chaine}
GROUP BY e.CodeEquipement, e.Designation, c.Libelle
ORDER BY [Pannes] DESC, [Arrêt (h)] DESC"),

            new("eq-arret", "equipements",
                "Quelles machines cumulent le plus d'heures d'arrêt ?",
                "Heures d'arrêt de production imputables à chaque machine sur la période.",
                "barres", new[] { "periode", "chaine", "top" }, $@"
SELECT TOP (@top) e.Designation AS [Machine], CAST(SUM({Arret}) AS decimal(10,1)) AS [Arrêt (h)]
FROM DemandeInterventions d JOIN Equipments e ON e.IdEquipement = d.IDEquipement
WHERE d.IsActif = 1 AND {ArretDansPeriode} AND {Chaine}
GROUP BY e.Designation ORDER BY [Arrêt (h)] DESC"),

            new("eq-disponibilite", "equipements",
                "Quelle est la disponibilité de chaque machine ?",
                "Disponibilité = 1 − heures d'arrêt / heures de la période, pour toutes les machines en service.",
                "table", PC, $@"
SELECT e.CodeEquipement AS [Code], e.Designation AS [Machine], c.Libelle AS [Chaîne],
       CAST(ISNULL(a.Heures, 0) AS decimal(10,1)) AS [Arrêt (h)],
       CAST(100.0 * (1 - ISNULL(a.Heures, 0) / {HeuresPeriode}) AS decimal(5,1)) AS [Disponibilité (%)]
FROM Equipments e
LEFT JOIN ChaineProductions c ON c.IDChaineProduction = e.IdChaineProduction
OUTER APPLY (SELECT SUM({Arret}) AS Heures FROM DemandeInterventions d
             WHERE d.IDEquipement = e.IdEquipement AND d.IsActif = 1 AND {ArretDansPeriode}) a
WHERE e.IsDeleted = 0 AND (@chaine IS NULL OR e.IdChaineProduction = @chaine)
ORDER BY [Disponibilité (%)], e.Designation"),

            new("eq-mtbf-mttr", "equipements",
                "Quels sont le MTBF et le MTTR de chaque machine ?",
                "MTBF : temps moyen entre deux pannes. MTTR : durée moyenne de réparation.",
                "table", PC, $@"
SELECT e.CodeEquipement AS [Code], e.Designation AS [Machine], COUNT(d.IdDemandeIntervention) AS [Pannes],
       CAST(({HeuresPeriode} - ISNULL(SUM({Arret}), 0)) / NULLIF(COUNT(d.IdDemandeIntervention), 0) AS decimal(10,1)) AS [MTBF (h)],
       CAST(AVG(CASE WHEN d.DatePriseEnCharge IS NOT NULL AND d.DateRealisation IS NOT NULL
                     THEN DATEDIFF(MINUTE, d.DatePriseEnCharge, d.DateRealisation) / 60.0 END) AS decimal(10,1)) AS [MTTR (h)]
FROM Equipments e
JOIN DemandeInterventions d ON d.IDEquipement = e.IdEquipement AND d.IsActif = 1 AND d.MachineArretee = 1
                           AND d.StatusId <> 5 AND {Periode}
WHERE e.IsDeleted = 0 AND (@chaine IS NULL OR e.IdChaineProduction = @chaine)
GROUP BY e.CodeEquipement, e.Designation
ORDER BY [Pannes] DESC"),

            new("eq-cout", "equipements",
                "Quelles machines coûtent le plus en maintenance ?",
                "Main-d'œuvre, pièces et prestations externes des interventions de la période.",
                "table", new[] { "periode", "chaine", "top" }, $@"
SELECT TOP (@top) e.CodeEquipement AS [Code], e.Designation AS [Machine], COUNT(*) AS [Interventions],
       CAST(SUM(ISNULL(mo.Cout, 0)) AS decimal(14,3)) AS [Main-d'œuvre (DT)],
       CAST(SUM(ISNULL(pc.Cout, 0)) AS decimal(14,3)) AS [Pièces (DT)],
       CAST(SUM(ISNULL(d.CoutExterne, 0)) AS decimal(14,3)) AS [Externe (DT)],
       CAST(SUM(ISNULL(mo.Cout, 0) + ISNULL(pc.Cout, 0) + ISNULL(d.CoutExterne, 0)) AS decimal(14,3)) AS [Total (DT)]
FROM DemandeInterventions d
JOIN Equipments e ON e.IdEquipement = d.IDEquipement
OUTER APPLY (SELECT SUM({CoutMO}) AS Cout FROM InterventionTemps t JOIN Users ut ON ut.ID = t.IdTechnicien WHERE t.IdDemandeIntervention = d.IdDemandeIntervention) mo
OUTER APPLY (SELECT SUM(p.Quantite * p.PrixUnitaire) AS Cout FROM InterventionPieces p WHERE p.IdDemandeIntervention = d.IdDemandeIntervention) pc
WHERE d.IsActif = 1 AND d.StatusId <> 5 AND {Periode} AND {Chaine}
GROUP BY e.CodeEquipement, e.Designation
ORDER BY [Total (DT)] DESC"),

            new("eq-sans-preventif", "equipements",
                "Quelles machines n'ont aucun plan de maintenance préventive ?",
                "Machines en service non couvertes par un plan actif, avec leurs pannes des 12 derniers mois.",
                "table", new[] { "chaine" }, @"
SELECT e.CodeEquipement AS [Code], e.Designation AS [Machine], c.Libelle AS [Chaîne], cr.NomCriticite AS [Criticité],
       (SELECT COUNT(*) FROM DemandeInterventions d WHERE d.IDEquipement = e.IdEquipement AND d.IsActif = 1
           AND d.MachineArretee = 1 AND d.StatusId <> 5 AND d.DateCreation >= DATEADD(MONTH, -12, GETDATE())) AS [Pannes sur 12 mois]
FROM Equipments e
LEFT JOIN ChaineProductions c ON c.IDChaineProduction = e.IdChaineProduction
LEFT JOIN EquipmentCriticites cr ON cr.IdCriticite = e.IdCriticite
WHERE e.IsDeleted = 0 AND (@chaine IS NULL OR e.IdChaineProduction = @chaine)
  AND NOT EXISTS (SELECT 1 FROM PlansPreventifs p WHERE p.IdEquipement = e.IdEquipement AND p.IsActif = 1)
ORDER BY [Pannes sur 12 mois] DESC, e.Designation"),

            new("eq-garantie", "equipements",
                "Quelles garanties arrivent à échéance dans les 90 jours ?",
                "Machines dont la garantie se termine bientôt, pour planifier les réclamations.",
                "table", new[] { "chaine" }, @"
SELECT e.CodeEquipement AS [Code], e.Designation AS [Machine], c.Libelle AS [Chaîne], e.DateFinGarantie AS [Fin de garantie],
       DATEDIFF(DAY, CAST(GETDATE() AS date), e.DateFinGarantie) AS [Jours restants]
FROM Equipments e LEFT JOIN ChaineProductions c ON c.IDChaineProduction = e.IdChaineProduction
WHERE e.IsDeleted = 0 AND e.DateFinGarantie >= CAST(GETDATE() AS date) AND e.DateFinGarantie < DATEADD(DAY, 90, GETDATE())
  AND (@chaine IS NULL OR e.IdChaineProduction = @chaine)
ORDER BY e.DateFinGarantie"),

            new("eq-par-chaine", "equipements",
                "Combien de machines compte chaque chaîne, et dans quel état ?",
                "Inventaire du parc par chaîne et par état.",
                "table", Array.Empty<string>(), @"
SELECT ISNULL(c.Libelle, 'Non affectée') AS [Chaîne], ISNULL(et.NomEtat, 'Non renseigné') AS [État], COUNT(*) AS [Machines],
       CAST(SUM(ISNULL(e.CoutAchat, 0)) AS decimal(14,3)) AS [Valeur d'achat (DT)]
FROM Equipments e
LEFT JOIN ChaineProductions c ON c.IDChaineProduction = e.IdChaineProduction
LEFT JOIN EtatEquipements et ON et.IdEtat = e.IdEtat
WHERE e.IsDeleted = 0
GROUP BY c.Libelle, et.NomEtat ORDER BY [Chaîne], [Machines] DESC"),

            new("eq-sans-intervention", "equipements",
                "Quelles machines n'ont eu aucune intervention depuis 12 mois ?",
                "Machines sans aucun suivi récent : à vérifier ou à intégrer au préventif.",
                "table", new[] { "chaine" }, @"
SELECT e.CodeEquipement AS [Code], e.Designation AS [Machine], c.Libelle AS [Chaîne],
       (SELECT MAX(d.DateCreation) FROM DemandeInterventions d WHERE d.IDEquipement = e.IdEquipement AND d.IsActif = 1) AS [Dernière intervention]
FROM Equipments e LEFT JOIN ChaineProductions c ON c.IDChaineProduction = e.IdChaineProduction
WHERE e.IsDeleted = 0 AND (@chaine IS NULL OR e.IdChaineProduction = @chaine)
  AND NOT EXISTS (SELECT 1 FROM DemandeInterventions d WHERE d.IDEquipement = e.IdEquipement AND d.IsActif = 1
                  AND d.DateCreation >= DATEADD(MONTH, -12, GETDATE()))
ORDER BY e.Designation"),

            new("eq-historique", "equipements",
                "Quel est l'historique complet d'une machine ?",
                "Toutes les interventions de la machine choisie sur la période, avec leur coût.",
                "table", new[] { "periode", "equipement" }, $@"
SELECT CONCAT('INT-', RIGHT(CONCAT('0000', d.IdDemandeIntervention), 4)) AS [Référence], d.DateCreation AS [Date],
       ty.Libelle AS [Type], d.Titre AS [Intervention], s.Statut AS [Statut], d.Cause AS [Cause], d.Remede AS [Remède],
       CAST(ISNULL(mo.Cout, 0) + ISNULL(pc.Cout, 0) + ISNULL(d.CoutExterne, 0) AS decimal(14,3)) AS [Coût (DT)]
FROM DemandeInterventions d
JOIN Statuses s ON s.Id = d.StatusId
JOIN TypeInterventions ty ON ty.IDTypeIntervention = d.IDTypeIntervention
OUTER APPLY (SELECT SUM({CoutMO}) AS Cout FROM InterventionTemps t JOIN Users ut ON ut.ID = t.IdTechnicien WHERE t.IdDemandeIntervention = d.IdDemandeIntervention) mo
OUTER APPLY (SELECT SUM(p.Quantite * p.PrixUnitaire) AS Cout FROM InterventionPieces p WHERE p.IdDemandeIntervention = d.IdDemandeIntervention) pc
WHERE d.IsActif = 1 AND d.IDEquipement = @equipement AND {Periode}
ORDER BY d.DateCreation DESC", new[] { "equipement" }),

            // ==============================================================
            // Préventif
            // ==============================================================
            new("pm-respect", "preventif",
                "Quel est le taux de respect du préventif ?",
                "Échéances de la période réalisées dans un délai de 2 jours après la date prévue.",
                "chiffre", PC, $@"
SELECT COUNT(*) AS [Échéances],
       SUM(CASE WHEN d.DateRealisation IS NOT NULL AND CAST(d.DateRealisation AS date) <= DATEADD(DAY, 2, d.DatePlanifiee) THEN 1 ELSE 0 END) AS [Réalisées à temps],
       SUM(CASE WHEN d.DateRealisation IS NOT NULL AND CAST(d.DateRealisation AS date) > DATEADD(DAY, 2, d.DatePlanifiee) THEN 1 ELSE 0 END) AS [Réalisées en retard],
       SUM(CASE WHEN d.DateRealisation IS NULL THEN 1 ELSE 0 END) AS [Non réalisées],
       CAST(100.0 * SUM(CASE WHEN d.DateRealisation IS NOT NULL AND CAST(d.DateRealisation AS date) <= DATEADD(DAY, 2, d.DatePlanifiee) THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0) AS decimal(5,1)) AS [Taux de respect (%)]
FROM DemandeInterventions d
WHERE d.IsActif = 1 AND d.IdPlanPreventif IS NOT NULL AND d.StatusId <> 5
  AND d.DatePlanifiee >= @debut AND d.DatePlanifiee < @fin AND d.DatePlanifiee <= CAST(GETDATE() AS date) AND {Chaine}"),

            new("pm-en-retard", "preventif",
                "Quelles maintenances préventives sont en retard ?",
                "Préventifs dont la date prévue est dépassée et qui ne sont pas réalisés.",
                "table", new[] { "chaine", "technicien" }, $@"
SELECT CONCAT('INT-', RIGHT(CONCAT('0000', d.IdDemandeIntervention), 4)) AS [Référence], p.Code AS [Plan], d.Titre AS [Maintenance],
       e.Designation AS [Machine], CONCAT(t.Prenom, ' ', t.Nom) AS [Technicien], d.DatePlanifiee AS [Prévue le],
       DATEDIFF(DAY, d.DatePlanifiee, CAST(GETDATE() AS date)) AS [Retard (jours)]
FROM DemandeInterventions d
JOIN PlansPreventifs p ON p.Id = d.IdPlanPreventif
LEFT JOIN Equipments e ON e.IdEquipement = d.IDEquipement
LEFT JOIN Users t ON t.ID = d.DestinatairesID
WHERE d.IsActif = 1 AND d.StatusId IN (1,2) AND d.DatePlanifiee < CAST(GETDATE() AS date) AND {Chaine} AND {Technicien}
ORDER BY d.DatePlanifiee"),

            new("pm-a-venir", "preventif",
                "Quelles maintenances préventives sont prévues dans les 30 prochains jours ?",
                "Échéances à venir des plans actifs, pour préparer pièces et équipes.",
                "table", new[] { "chaine" }, @"
SELECT p.ProchaineEcheance AS [Échéance], p.Code AS [Plan], p.Titre AS [Maintenance], e.Designation AS [Machine],
       c.Libelle AS [Chaîne], CONCAT(t.Prenom, ' ', t.Nom) AS [Technicien],
       CAST(p.DureeEstimeeMinutes / 60.0 AS decimal(6,1)) AS [Durée estimée (h)]
FROM PlansPreventifs p
JOIN Equipments e ON e.IdEquipement = p.IdEquipement
LEFT JOIN ChaineProductions c ON c.IDChaineProduction = e.IdChaineProduction
LEFT JOIN Users t ON t.ID = p.IdTechnicien
WHERE p.IsActif = 1 AND e.IsDeleted = 0 AND p.ProchaineEcheance < DATEADD(DAY, 30, CAST(GETDATE() AS date))
  AND (@chaine IS NULL OR e.IdChaineProduction = @chaine)
UNION ALL
SELECT d.DatePlanifiee, p.Code, d.Titre, e.Designation, c.Libelle, CONCAT(t.Prenom, ' ', t.Nom), CAST(d.DureeEstimeeMinutes / 60.0 AS decimal(6,1))
FROM DemandeInterventions d
JOIN PlansPreventifs p ON p.Id = d.IdPlanPreventif
LEFT JOIN Equipments e ON e.IdEquipement = d.IDEquipement
LEFT JOIN ChaineProductions c ON c.IDChaineProduction = d.IDChaineProduction
LEFT JOIN Users t ON t.ID = d.DestinatairesID
WHERE d.IsActif = 1 AND d.StatusId IN (1,2) AND d.DatePlanifiee >= CAST(GETDATE() AS date)
  AND d.DatePlanifiee < DATEADD(DAY, 30, CAST(GETDATE() AS date)) AND (@chaine IS NULL OR d.IDChaineProduction = @chaine)
ORDER BY [Échéance]"),

            new("pm-part", "preventif",
                "Quelle part du temps de maintenance est consacrée au préventif ?",
                "Heures saisies sur les interventions préventives et correctives. L'objectif usuel dépasse 50 % de préventif.",
                "chiffre", PC, $@"
SELECT CAST(SUM(CASE WHEN d.IdPlanPreventif IS NOT NULL OR ty.Libelle LIKE N'%ventive%' THEN t.DureeMinutes ELSE 0 END) / 60.0 AS decimal(10,1)) AS [Préventif (h)],
       CAST(SUM(CASE WHEN d.IdPlanPreventif IS NULL AND ty.Libelle NOT LIKE N'%ventive%' THEN t.DureeMinutes ELSE 0 END) / 60.0 AS decimal(10,1)) AS [Correctif (h)],
       CAST(100.0 * SUM(CASE WHEN d.IdPlanPreventif IS NOT NULL OR ty.Libelle LIKE N'%ventive%' THEN t.DureeMinutes ELSE 0 END) / NULLIF(SUM(t.DureeMinutes), 0) AS decimal(5,1)) AS [Part du préventif (%)]
FROM InterventionTemps t
JOIN DemandeInterventions d ON d.IdDemandeIntervention = t.IdDemandeIntervention
JOIN TypeInterventions ty ON ty.IDTypeIntervention = d.IDTypeIntervention
WHERE d.IsActif = 1 AND t.Debut >= @debut AND t.Debut < @fin AND {Chaine}"),

            new("pm-par-technicien", "preventif",
                "Comment la charge préventive est-elle répartie entre techniciens ?",
                "Préventifs de la période par technicien : prévus, réalisés et en retard.",
                "table", PC, $@"
SELECT ISNULL(CONCAT(t.Prenom, ' ', t.Nom), 'Non affecté') AS [Technicien], COUNT(*) AS [Prévus],
       SUM(CASE WHEN d.DateRealisation IS NOT NULL THEN 1 ELSE 0 END) AS [Réalisés],
       SUM(CASE WHEN d.DateRealisation IS NULL AND d.DatePlanifiee < CAST(GETDATE() AS date) THEN 1 ELSE 0 END) AS [En retard],
       CAST(SUM(ISNULL(d.DureeEstimeeMinutes, 0)) / 60.0 AS decimal(10,1)) AS [Charge estimée (h)]
FROM DemandeInterventions d LEFT JOIN Users t ON t.ID = d.DestinatairesID
WHERE d.IsActif = 1 AND d.IdPlanPreventif IS NOT NULL AND d.StatusId <> 5
  AND d.DatePlanifiee >= @debut AND d.DatePlanifiee < @fin AND {Chaine}
GROUP BY t.Prenom, t.Nom ORDER BY [Prévus] DESC"),

            new("pm-plans", "preventif",
                "Quels plans de maintenance préventive sont actifs ?",
                "Liste des plans avec leur fréquence et leur prochaine échéance.",
                "table", new[] { "chaine", "equipement" }, @"
SELECT p.Code AS [Plan], p.Titre AS [Maintenance], e.Designation AS [Machine], c.Libelle AS [Chaîne],
       CONCAT('Tous les ', p.Intervalle, ' ', CASE p.Frequence WHEN 'Jour' THEN 'jour(s)' WHEN 'Semaine' THEN 'semaine(s)' WHEN 'Annee' THEN 'an(s)' ELSE 'mois' END) AS [Fréquence],
       p.ProchaineEcheance AS [Prochaine échéance], CONCAT(t.Prenom, ' ', t.Nom) AS [Technicien],
       (SELECT COUNT(*) FROM PlanPreventifTaches pt WHERE pt.IdPlanPreventif = p.Id) AS [Étapes]
FROM PlansPreventifs p
JOIN Equipments e ON e.IdEquipement = p.IdEquipement
LEFT JOIN ChaineProductions c ON c.IDChaineProduction = e.IdChaineProduction
LEFT JOIN Users t ON t.ID = p.IdTechnicien
WHERE p.IsActif = 1 AND (@chaine IS NULL OR e.IdChaineProduction = @chaine) AND (@equipement IS NULL OR p.IdEquipement = @equipement)
ORDER BY p.ProchaineEcheance"),

            // ==============================================================
            // Magasin
            // ==============================================================
            new("mag-valeur", "magasin",
                "Quelle est la valeur du stock aujourd'hui ?",
                "Valeur des articles actifs au prix unitaire de référence.",
                "chiffre", Array.Empty<string>(), @"
SELECT COUNT(*) AS [Articles actifs],
       CAST(SUM(p.Quantite_Stock * p.PrixUnitaire) AS decimal(14,3)) AS [Valeur du stock (DT)],
       SUM(CASE WHEN p.Quantite_Stock <= 0 THEN 1 ELSE 0 END) AS [En rupture],
       SUM(CASE WHEN p.Quantite_Stock > 0 AND p.Quantite_Stock <= p.SeuilMinimum THEN 1 ELSE 0 END) AS [Sous le seuil]
FROM Pieces p WHERE p.IsActif = 1"),

            new("mag-sous-seuil", "magasin",
                "Quels articles sont sous le seuil de réapprovisionnement ?",
                "Articles en rupture ou sous le seuil, avec la quantité déjà en commande.",
                "table", new[] { "fournisseur" }, @"
SELECT p.CodePiece AS [Code], p.Designation AS [Article], p.Quantite_Stock AS [En stock], p.SeuilMinimum AS [Seuil],
       ISNULL(cmd.Qte, 0) AS [En commande], f.Nom AS [Fournisseur], m.Nom AS [Magasin], p.Emplacement AS [Emplacement]
FROM Pieces p
LEFT JOIN Fournisseurs f ON f.Id = p.IdFournisseur
LEFT JOIN Magasins m ON m.Id = p.IdMagasin
OUTER APPLY (SELECT SUM(l.Quantite - l.QuantiteRecue) AS Qte FROM BonCommandeLignes l JOIN BonsCommande b ON b.Id = l.IdBonCommande
             WHERE l.IdPiece = p.IDPiece AND b.Statut IN (N'Brouillon', N'Envoyé', N'Partiellement reçu')) cmd
WHERE p.IsActif = 1 AND p.Quantite_Stock <= p.SeuilMinimum AND (@fournisseur IS NULL OR p.IdFournisseur = @fournisseur)
ORDER BY p.Quantite_Stock, p.Designation"),

            new("mag-plus-consommes", "magasin",
                "Quels articles sont les plus consommés ?",
                "Sorties de stock de la période, classées par valeur.",
                "table", new[] { "periode", "top" }, @"
SELECT TOP (@top) p.CodePiece AS [Code], p.Designation AS [Article], -SUM(m.Quantite) AS [Quantité sortie], p.Unite AS [Unité],
       CAST(-SUM(m.Quantite * ISNULL(m.PrixUnitaire, p.PrixUnitaire)) AS decimal(14,3)) AS [Valeur (DT)],
       p.Quantite_Stock AS [Stock actuel]
FROM MouvementsStock m JOIN Pieces p ON p.IDPiece = m.IdPiece
WHERE m.Quantite < 0 AND m.Date >= @debut AND m.Date < @fin
GROUP BY p.CodePiece, p.Designation, p.Unite, p.Quantite_Stock
ORDER BY [Valeur (DT)] DESC"),

            new("mag-dormants", "magasin",
                "Quels articles n'ont pas bougé depuis 12 mois ?",
                "Stock dormant : articles en stock sans aucune sortie depuis un an.",
                "table", Array.Empty<string>(), @"
SELECT p.CodePiece AS [Code], p.Designation AS [Article], p.Quantite_Stock AS [En stock],
       CAST(p.Quantite_Stock * p.PrixUnitaire AS decimal(14,3)) AS [Valeur (DT)],
       (SELECT MAX(m.Date) FROM MouvementsStock m WHERE m.IdPiece = p.IDPiece AND m.Quantite < 0) AS [Dernière sortie]
FROM Pieces p
WHERE p.IsActif = 1 AND p.Quantite_Stock > 0
  AND NOT EXISTS (SELECT 1 FROM MouvementsStock m WHERE m.IdPiece = p.IDPiece AND m.Quantite < 0 AND m.Date >= DATEADD(MONTH, -12, GETDATE()))
ORDER BY [Valeur (DT)] DESC"),

            new("mag-par-famille", "magasin",
                "Comment la valeur du stock se répartit-elle par famille ?",
                "Valeur et nombre d'articles par famille.",
                "barres", Array.Empty<string>(), @"
SELECT f.NomFamille AS [Famille], CAST(SUM(p.Quantite_Stock * p.PrixUnitaire) AS decimal(14,3)) AS [Valeur (DT)], COUNT(*) AS [Articles]
FROM Pieces p JOIN FamillePieces f ON f.IDFamillePiece = p.IDFamillePiece
WHERE p.IsActif = 1
GROUP BY f.NomFamille ORDER BY [Valeur (DT)] DESC"),

            new("mag-mouvements", "magasin",
                "Quels mouvements de stock ont eu lieu sur la période ?",
                "Journal des entrées, sorties et ajustements, éventuellement pour un article.",
                "table", new[] { "periode", "article" }, @"
SELECT TOP 1000 m.Date AS [Date], m.Type AS [Type], p.CodePiece AS [Code], p.Designation AS [Article],
       m.Quantite AS [Quantité], m.StockApres AS [Stock après], m.Motif AS [Motif],
       CONCAT(u.Prenom, ' ', u.Nom) AS [Par]
FROM MouvementsStock m JOIN Pieces p ON p.IDPiece = m.IdPiece
LEFT JOIN Users u ON u.ID = m.UtilisateurId
WHERE m.Date >= @debut AND m.Date < @fin AND (@article IS NULL OR m.IdPiece = @article)
ORDER BY m.Date DESC, m.Id DESC"),

            new("mag-conso-machine", "magasin",
                "Quelles pièces une machine consomme-t-elle ?",
                "Pièces sorties pour les interventions de la machine choisie.",
                "table", new[] { "periode", "equipement" }, @"
SELECT p.CodePiece AS [Code], p.Designation AS [Article], SUM(ip.Quantite) AS [Quantité], p.Unite AS [Unité],
       CAST(SUM(ip.Quantite * ip.PrixUnitaire) AS decimal(14,3)) AS [Valeur (DT)], COUNT(DISTINCT ip.IdDemandeIntervention) AS [Interventions]
FROM InterventionPieces ip
JOIN DemandeInterventions d ON d.IdDemandeIntervention = ip.IdDemandeIntervention
JOIN Pieces p ON p.IDPiece = ip.IdPiece
WHERE d.IsActif = 1 AND d.IDEquipement = @equipement AND ip.Date >= @debut AND ip.Date < @fin
GROUP BY p.CodePiece, p.Designation, p.Unite ORDER BY [Valeur (DT)] DESC", new[] { "equipement" }),

            new("mag-ajustements", "magasin",
                "Quels écarts d'inventaire ont été constatés ?",
                "Ajustements de stock (inventaire, casse, perte) et leur valeur.",
                "table", P, @"
SELECT m.Date AS [Date], p.CodePiece AS [Code], p.Designation AS [Article], m.Quantite AS [Écart],
       CAST(m.Quantite * ISNULL(m.PrixUnitaire, p.PrixUnitaire) AS decimal(14,3)) AS [Valeur (DT)], m.Motif AS [Motif]
FROM MouvementsStock m JOIN Pieces p ON p.IDPiece = m.IdPiece
WHERE m.Type = N'Ajustement' AND m.Date >= @debut AND m.Date < @fin
ORDER BY ABS(m.Quantite * ISNULL(m.PrixUnitaire, p.PrixUnitaire)) DESC"),

            // ==============================================================
            // Achats
            // ==============================================================
            new("ach-engage", "achats",
                "Combien a-t-on commandé et reçu sur la période ?",
                "Bons de commande émis sur la période (hors brouillons et annulés).",
                "chiffre", new[] { "periode", "fournisseur" }, @"
SELECT COUNT(DISTINCT b.Id) AS [Bons de commande],
       CAST(SUM(l.Quantite * l.PrixUnitaire) AS decimal(14,3)) AS [Montant commandé (DT)],
       CAST(SUM(l.QuantiteRecue * l.PrixUnitaire) AS decimal(14,3)) AS [Montant reçu (DT)],
       CAST(SUM((l.Quantite - l.QuantiteRecue) * l.PrixUnitaire) AS decimal(14,3)) AS [Reste à recevoir (DT)]
FROM BonsCommande b JOIN BonCommandeLignes l ON l.IdBonCommande = b.Id
WHERE b.Statut NOT IN (N'Brouillon', N'Annulé') AND b.DateCommande >= @debut AND b.DateCommande < @fin
  AND (@fournisseur IS NULL OR b.IdFournisseur = @fournisseur)"),

            new("ach-par-fournisseur", "achats",
                "Combien a-t-on commandé à chaque fournisseur ?",
                "Montant des commandes de la période par fournisseur.",
                "barres", P, @"
SELECT f.Nom AS [Fournisseur], CAST(SUM(l.Quantite * l.PrixUnitaire) AS decimal(14,3)) AS [Montant (DT)], COUNT(DISTINCT b.Id) AS [Commandes]
FROM BonsCommande b JOIN BonCommandeLignes l ON l.IdBonCommande = b.Id JOIN Fournisseurs f ON f.Id = b.IdFournisseur
WHERE b.Statut NOT IN (N'Brouillon', N'Annulé') AND b.DateCommande >= @debut AND b.DateCommande < @fin
GROUP BY f.Nom ORDER BY [Montant (DT)] DESC"),

            new("ach-retards", "achats",
                "Quelles commandes sont en retard de livraison ?",
                "Commandes envoyées dont la date de livraison prévue est dépassée.",
                "table", new[] { "fournisseur" }, @"
SELECT b.Numero AS [Commande], f.Nom AS [Fournisseur], b.DateCommande AS [Commandée le], b.DateLivraisonPrevue AS [Livraison prévue],
       DATEDIFF(DAY, b.DateLivraisonPrevue, CAST(GETDATE() AS date)) AS [Retard (jours)], b.Statut AS [Statut],
       CAST((SELECT SUM((l.Quantite - l.QuantiteRecue) * l.PrixUnitaire) FROM BonCommandeLignes l WHERE l.IdBonCommande = b.Id) AS decimal(14,3)) AS [Reste à recevoir (DT)]
FROM BonsCommande b JOIN Fournisseurs f ON f.Id = b.IdFournisseur
WHERE b.Statut IN (N'Envoyé', N'Partiellement reçu') AND b.DateLivraisonPrevue < CAST(GETDATE() AS date)
  AND (@fournisseur IS NULL OR b.IdFournisseur = @fournisseur)
ORDER BY b.DateLivraisonPrevue"),

            new("ach-ponctualite", "achats",
                "Quels fournisseurs livrent à l'heure ?",
                "Commandes entièrement reçues sur la période et ponctualité par fournisseur.",
                "table", P, @"
SELECT f.Nom AS [Fournisseur], COUNT(*) AS [Livraisons],
       SUM(CASE WHEN CAST(b.DateReceptionComplete AS date) <= b.DateLivraisonPrevue THEN 1 ELSE 0 END) AS [À l'heure],
       CAST(100.0 * SUM(CASE WHEN CAST(b.DateReceptionComplete AS date) <= b.DateLivraisonPrevue THEN 1 ELSE 0 END) / COUNT(*) AS decimal(5,1)) AS [Ponctualité (%)],
       CAST(AVG(DATEDIFF(DAY, b.DateCommande, b.DateReceptionComplete) * 1.0) AS decimal(6,1)) AS [Délai moyen (jours)]
FROM BonsCommande b JOIN Fournisseurs f ON f.Id = b.IdFournisseur
WHERE b.DateReceptionComplete IS NOT NULL AND b.DateLivraisonPrevue IS NOT NULL
  AND b.DateReceptionComplete >= @debut AND b.DateReceptionComplete < @fin
GROUP BY f.Nom ORDER BY [Ponctualité (%)] DESC"),

            new("ach-da-attente", "achats",
                "Quelles demandes d'achat attendent une décision ?",
                "Demandes soumises par les techniciens, non encore approuvées ou refusées.",
                "table", Array.Empty<string>(), @"
SELECT a.Numero AS [Demande], a.DateDemande AS [Soumise le], CONCAT(u.Prenom, ' ', u.Nom) AS [Demandeur], a.Motif AS [Motif],
       (SELECT COUNT(*) FROM DemandeAchatLignes l WHERE l.IdDemandeAchat = a.Id) AS [Lignes],
       CAST((SELECT SUM(l.Quantite * ISNULL(l.PrixEstime, 0)) FROM DemandeAchatLignes l WHERE l.IdDemandeAchat = a.Id) AS decimal(14,3)) AS [Montant estimé (DT)]
FROM DemandesAchat a JOIN Users u ON u.ID = a.IdDemandeur
WHERE a.Statut = N'Soumise'
ORDER BY a.DateDemande"),

            new("ach-prix-article", "achats",
                "Comment le prix d'achat d'un article a-t-il évolué ?",
                "Prix unitaire de chaque commande de l'article choisi.",
                "table", new[] { "article" }, @"
SELECT b.DateCommande AS [Date], b.Numero AS [Commande], f.Nom AS [Fournisseur], l.Quantite AS [Quantité],
       CAST(l.PrixUnitaire AS decimal(14,3)) AS [Prix unitaire (DT)]
FROM BonCommandeLignes l JOIN BonsCommande b ON b.Id = l.IdBonCommande JOIN Fournisseurs f ON f.Id = b.IdFournisseur
WHERE l.IdPiece = @article AND b.Statut <> N'Annulé'
ORDER BY b.DateCommande DESC", new[] { "article" }),

            // ==============================================================
            // Techniciens
            // ==============================================================
            new("tech-heures", "techniciens",
                "Combien d'heures chaque technicien a-t-il saisies ?",
                "Temps passé sur les interventions de la période.",
                "barres", new[] { "periode", "chaine" }, $@"
SELECT CONCAT(u.Prenom, ' ', u.Nom) AS [Technicien], CAST(SUM(t.DureeMinutes) / 60.0 AS decimal(10,1)) AS [Heures (h)],
       COUNT(DISTINCT t.IdDemandeIntervention) AS [Interventions]
FROM InterventionTemps t JOIN Users u ON u.ID = t.IdTechnicien
JOIN DemandeInterventions d ON d.IdDemandeIntervention = t.IdDemandeIntervention
WHERE d.IsActif = 1 AND t.Debut >= @debut AND t.Debut < @fin AND {Chaine}
GROUP BY u.Prenom, u.Nom ORDER BY [Heures (h)] DESC"),

            new("tech-realisees", "techniciens",
                "Combien d'interventions chaque technicien a-t-il réalisées ?",
                "Interventions terminées sur la période, délai de prise en charge et durée de réparation.",
                "table", PC, $@"
SELECT CONCAT(u.Prenom, ' ', u.Nom) AS [Technicien], COUNT(*) AS [Réalisées],
       SUM(CASE WHEN d.MachineArretee = 1 THEN 1 ELSE 0 END) AS [Dont pannes],
       CAST(AVG(CASE WHEN d.DatePriseEnCharge IS NOT NULL THEN DATEDIFF(MINUTE, d.DateCreation, d.DatePriseEnCharge) / 60.0 END) AS decimal(10,1)) AS [Prise en charge moyenne (h)],
       CAST(AVG(CASE WHEN d.DatePriseEnCharge IS NOT NULL THEN DATEDIFF(MINUTE, d.DatePriseEnCharge, d.DateRealisation) / 60.0 END) AS decimal(10,1)) AS [Réparation moyenne (h)]
FROM DemandeInterventions d JOIN Users u ON u.ID = d.DestinatairesID
WHERE d.IsActif = 1 AND d.StatusId IN (3,4) AND d.DateRealisation >= @debut AND d.DateRealisation < @fin AND {Chaine}
GROUP BY u.Prenom, u.Nom ORDER BY [Réalisées] DESC"),

            new("tech-charge", "techniciens",
                "Quelle est la charge actuelle de chaque technicien ?",
                "Interventions ouvertes affectées et heures estimées restantes.",
                "table", Array.Empty<string>(), @"
SELECT CONCAT(u.Prenom, ' ', u.Nom) AS [Technicien], u.Specialite AS [Spécialité],
       SUM(CASE WHEN d.StatusId = 1 THEN 1 ELSE 0 END) AS [À traiter],
       SUM(CASE WHEN d.StatusId = 2 THEN 1 ELSE 0 END) AS [En cours],
       SUM(CASE WHEN d.DatePlanifiee < CAST(GETDATE() AS date) THEN 1 ELSE 0 END) AS [En retard],
       CAST(SUM(ISNULL(d.DureeEstimeeMinutes, 0)) / 60.0 AS decimal(10,1)) AS [Charge estimée (h)]
FROM Users u JOIN Roles r ON r.IDRole = u.IDRole
LEFT JOIN DemandeInterventions d ON d.DestinatairesID = u.ID AND d.IsActif = 1 AND d.StatusId IN (1,2)
WHERE u.IsActif = 1 AND r.Libelle = N'Utilisateur'
GROUP BY u.Prenom, u.Nom, u.Specialite ORDER BY COUNT(d.IdDemandeIntervention) DESC"),

            new("tech-cout-mo", "techniciens",
                "Combien coûte la main-d'œuvre de chaque technicien ?",
                "Heures saisies multipliées par le taux horaire, sur la période.",
                "table", new[] { "periode", "chaine" }, $@"
SELECT CONCAT(ut.Prenom, ' ', ut.Nom) AS [Technicien], CAST(SUM(t.DureeMinutes) / 60.0 AS decimal(10,1)) AS [Heures (h)],
       CAST(MAX(COALESCE(t.TauxHoraire, ut.TauxHoraire, 0)) AS decimal(10,3)) AS [Taux horaire (DT)],
       CAST(SUM({CoutMO}) AS decimal(14,3)) AS [Coût (DT)]
FROM InterventionTemps t JOIN Users ut ON ut.ID = t.IdTechnicien
JOIN DemandeInterventions d ON d.IdDemandeIntervention = t.IdDemandeIntervention
WHERE d.IsActif = 1 AND t.Debut >= @debut AND t.Debut < @fin AND {Chaine}
GROUP BY ut.Prenom, ut.Nom ORDER BY [Coût (DT)] DESC"),

            // ==============================================================
            // Coûts et budgets
            // ==============================================================
            new("cout-total", "couts",
                "Combien a coûté la maintenance sur la période ?",
                "Main-d'œuvre, pièces consommées et prestations externes.",
                "chiffre", PC, $@"
SELECT CAST(ISNULL((SELECT SUM({CoutMO}) FROM InterventionTemps t JOIN Users ut ON ut.ID = t.IdTechnicien
                    JOIN DemandeInterventions d ON d.IdDemandeIntervention = t.IdDemandeIntervention
                    WHERE d.IsActif = 1 AND t.Debut >= @debut AND t.Debut < @fin AND {Chaine}), 0) AS decimal(14,3)) AS [Main-d'œuvre (DT)],
       CAST(ISNULL((SELECT SUM(p.Quantite * p.PrixUnitaire) FROM InterventionPieces p
                    JOIN DemandeInterventions d ON d.IdDemandeIntervention = p.IdDemandeIntervention
                    WHERE d.IsActif = 1 AND p.Date >= @debut AND p.Date < @fin AND {Chaine}), 0) AS decimal(14,3)) AS [Pièces (DT)],
       CAST(ISNULL((SELECT SUM(d.CoutExterne) FROM DemandeInterventions d
                    WHERE d.IsActif = 1 AND COALESCE(d.DateRealisation, d.DateCreation) >= @debut AND COALESCE(d.DateRealisation, d.DateCreation) < @fin AND {Chaine}), 0) AS decimal(14,3)) AS [Prestations externes (DT)]"),

            new("cout-mensuel", "couts",
                "Comment évoluent les coûts de maintenance chaque mois ?",
                "Coûts mensuels par nature sur la période.",
                "ligne", PC, $@"
WITH mois AS (
    SELECT DATEFROMPARTS(YEAR(@debut), MONTH(@debut), 1) AS m
    UNION ALL SELECT DATEADD(MONTH, 1, m) FROM mois WHERE DATEADD(MONTH, 1, m) < @fin
)
SELECT FORMAT(mois.m, 'yyyy-MM') AS [Mois],
       CAST(ISNULL((SELECT SUM({CoutMO}) FROM InterventionTemps t JOIN Users ut ON ut.ID = t.IdTechnicien
                    JOIN DemandeInterventions d ON d.IdDemandeIntervention = t.IdDemandeIntervention
                    WHERE d.IsActif = 1 AND {Chaine} AND t.Debut >= mois.m AND t.Debut < DATEADD(MONTH, 1, mois.m)), 0) AS decimal(14,3)) AS [Main-d'œuvre (DT)],
       CAST(ISNULL((SELECT SUM(p.Quantite * p.PrixUnitaire) FROM InterventionPieces p
                    JOIN DemandeInterventions d ON d.IdDemandeIntervention = p.IdDemandeIntervention
                    WHERE d.IsActif = 1 AND {Chaine} AND p.Date >= mois.m AND p.Date < DATEADD(MONTH, 1, mois.m)), 0) AS decimal(14,3)) AS [Pièces (DT)],
       CAST(ISNULL((SELECT SUM(d.CoutExterne) FROM DemandeInterventions d
                    WHERE d.IsActif = 1 AND {Chaine} AND COALESCE(d.DateRealisation, d.DateCreation) >= mois.m
                      AND COALESCE(d.DateRealisation, d.DateCreation) < DATEADD(MONTH, 1, mois.m)), 0) AS decimal(14,3)) AS [Externe (DT)]
FROM mois ORDER BY mois.m
OPTION (MAXRECURSION 400)"),

            new("cout-par-chaine", "couts",
                "Quelle chaîne coûte le plus en maintenance ?",
                "Coût complet des interventions de la période par chaîne de production.",
                "barres", P, $@"
SELECT c.Libelle AS [Chaîne],
       CAST(SUM(ISNULL(mo.Cout, 0) + ISNULL(pc.Cout, 0) + ISNULL(d.CoutExterne, 0)) AS decimal(14,3)) AS [Coût (DT)],
       COUNT(*) AS [Interventions]
FROM DemandeInterventions d
JOIN ChaineProductions c ON c.IDChaineProduction = d.IDChaineProduction
OUTER APPLY (SELECT SUM({CoutMO}) AS Cout FROM InterventionTemps t JOIN Users ut ON ut.ID = t.IdTechnicien WHERE t.IdDemandeIntervention = d.IdDemandeIntervention) mo
OUTER APPLY (SELECT SUM(p.Quantite * p.PrixUnitaire) AS Cout FROM InterventionPieces p WHERE p.IdDemandeIntervention = d.IdDemandeIntervention) pc
WHERE d.IsActif = 1 AND d.StatusId <> 5 AND {Periode}
GROUP BY c.Libelle ORDER BY [Coût (DT)] DESC"),

            new("budget-vs-reel", "couts",
                "Où en est-on du budget de maintenance de l'année ?",
                "Budget annuel par catégorie comparé aux dépenses réelles de l'année choisie.",
                "table", new[] { "annee" }, $@"
WITH reel AS (
    SELECT N'Main-d''œuvre' AS Categorie, SUM({CoutMO}) AS Montant
    FROM InterventionTemps t JOIN Users ut ON ut.ID = t.IdTechnicien
    JOIN DemandeInterventions d ON d.IdDemandeIntervention = t.IdDemandeIntervention
    WHERE d.IsActif = 1 AND YEAR(t.Debut) = @annee
    UNION ALL
    SELECT N'Pièces', SUM(p.Quantite * p.PrixUnitaire)
    FROM InterventionPieces p JOIN DemandeInterventions d ON d.IdDemandeIntervention = p.IdDemandeIntervention
    WHERE d.IsActif = 1 AND YEAR(p.Date) = @annee
    UNION ALL
    SELECT N'Sous-traitance', SUM(d.CoutExterne)
    FROM DemandeInterventions d WHERE d.IsActif = 1 AND YEAR(COALESCE(d.DateRealisation, d.DateCreation)) = @annee
), budget AS (
    SELECT b.Categorie, SUM(b.Montant) AS Montant FROM Budgets b
    WHERE b.Annee = @annee AND b.IdChaineProduction IS NULL GROUP BY b.Categorie
)
SELECT r.Categorie AS [Catégorie], CAST(ISNULL(b.Montant, 0) AS decimal(14,3)) AS [Budget (DT)],
       CAST(ISNULL(r.Montant, 0) AS decimal(14,3)) AS [Dépensé (DT)],
       CAST(100.0 * ISNULL(r.Montant, 0) / NULLIF(b.Montant, 0) AS decimal(6,1)) AS [Consommé (%)],
       CAST(ISNULL(b.Montant, 0) - ISNULL(r.Montant, 0) AS decimal(14,3)) AS [Reste (DT)]
FROM reel r LEFT JOIN budget b ON b.Categorie = r.Categorie"),
        };
    }
}
