namespace Core.Entities
{
    /// <summary>
    /// Preventive maintenance plan: a recurring job on one machine. Work orders are
    /// generated automatically a few days before each due date.
    /// </summary>
    public class PlanPreventif
    {
        public const string FrequenceJour = "Jour";
        public const string FrequenceSemaine = "Semaine";
        public const string FrequenceMois = "Mois";
        public const string FrequenceAnnee = "Annee";

        public int Id { get; set; }
        public string Code { get; set; } = string.Empty;
        public string Titre { get; set; } = string.Empty;
        public string? Description { get; set; }
        public int IdEquipement { get; set; }
        public Equipment Equipement { get; set; } = null!;
        public int? IdTypeIntervention { get; set; }
        public TypeIntervention? TypeIntervention { get; set; }
        // Every <Intervalle> <Frequence>: e.g. every 2 Semaine
        public string Frequence { get; set; } = FrequenceMois;
        public int Intervalle { get; set; } = 1;
        public int? DureeEstimeeMinutes { get; set; }
        public int? IdTechnicien { get; set; }
        public Users? Technicien { get; set; }
        public DateTime DateDebut { get; set; }
        public DateTime ProchaineEcheance { get; set; }
        public DateTime? DerniereGeneration { get; set; }
        // Work orders are created this many days before the due date
        public int DelaiGenerationJours { get; set; } = 7;
        public bool IsActif { get; set; } = true;
        public DateTime DateCreation { get; set; }
        public int? CreeParId { get; set; }
        public List<PlanPreventifTache> Taches { get; set; } = new();

        public DateTime NextAfter(DateTime date) => Frequence switch
        {
            FrequenceJour => date.AddDays(Intervalle),
            FrequenceSemaine => date.AddDays(7 * Intervalle),
            FrequenceAnnee => date.AddYears(Intervalle),
            _ => date.AddMonths(Intervalle)
        };
    }

    /// <summary>Checklist step of a plan, copied into each generated work order.</summary>
    public class PlanPreventifTache
    {
        public int Id { get; set; }
        public int IdPlanPreventif { get; set; }
        public PlanPreventif PlanPreventif { get; set; } = null!;
        public int Ordre { get; set; }
        public string Libelle { get; set; } = string.Empty;
    }
}
