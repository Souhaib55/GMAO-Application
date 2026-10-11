using System.Globalization;
using System.Text;
using API.Controllers;
using Core.Entities;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace API.Services
{
    public static class TextHelper
    {
        /// <summary>Lower case without accents, for tolerant label matching.</summary>
        public static string Normalize(string? value)
        {
            if (string.IsNullOrEmpty(value)) return string.Empty;
            var decomposed = value.ToLowerInvariant().Normalize(NormalizationForm.FormD);
            var sb = new StringBuilder(decomposed.Length);
            foreach (var c in decomposed)
                if (CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark) sb.Append(c);
            return sb.ToString();
        }

        public static bool IsPreventive(string? typeLibelle) => Normalize(typeLibelle).Contains("prevent");
    }

    public sealed record GenerationResult(int PlanId, string PlanCode, int InterventionId, DateTime Echeance);

    public interface IPreventifService
    {
        /// <summary>
        /// Creates the work orders of every active plan whose next due date is inside its
        /// generation window. Idempotent: a plan never gets two work orders for the same due date.
        /// </summary>
        Task<List<GenerationResult>> GenerateDueAsync(int? onlyPlanId = null, bool force = false, CurrentUser? actor = null);
    }

    public class PreventifService : IPreventifService
    {
        private readonly StoreContext _context;
        private readonly IJournalService _journal;
        private readonly ILogger<PreventifService> _logger;

        public PreventifService(StoreContext context, IJournalService journal, ILogger<PreventifService> logger)
        {
            _context = context;
            _journal = journal;
            _logger = logger;
        }

        public async Task<List<GenerationResult>> GenerateDueAsync(int? onlyPlanId = null, bool force = false, CurrentUser? actor = null)
        {
            var results = new List<GenerationResult>();
            var today = DateTime.Today;

            var query = _context.PlansPreventifs
                .Include(p => p.Taches)
                .Include(p => p.Equipement)
                .Where(p => p.IsActif && !p.Equipement.IsDeleted);
            if (onlyPlanId.HasValue) query = query.Where(p => p.Id == onlyPlanId.Value);

            var plans = await query.ToListAsync();
            if (plans.Count == 0) return results;

            // Reference data resolved once
            var types = await _context.TypeInterventions.Where(t => t.IsActif).ToListAsync();
            var defaultTypeId = types.FirstOrDefault(t => TextHelper.IsPreventive(t.Libelle))?.IDTypeIntervention
                                ?? types.OrderBy(t => t.IDTypeIntervention).Select(t => (int?)t.IDTypeIntervention).FirstOrDefault();
            var urgences = await _context.Urgences.Where(u => u.IsActif).ToListAsync();
            var urgenceId = urgences.FirstOrDefault(u => TextHelper.Normalize(u.Libelle).Contains("normal"))?.IDUrgence
                            ?? urgences.OrderBy(u => u.IDUrgence).Select(u => (int?)u.IDUrgence).FirstOrDefault();
            var panneId = await _context.Pannes.Where(p => p.IsActif).OrderBy(p => p.IDPanne).Select(p => (int?)p.IDPanne).FirstOrDefaultAsync();
            var chaineFallback = await _context.ChaineProductions.Where(c => c.IsActif).OrderBy(c => c.IDChaineProduction).Select(c => (int?)c.IDChaineProduction).FirstOrDefaultAsync();
            var etats = await _context.Etats.Where(e => e.IsActif).ToListAsync();
            var etatId = etats.FirstOrDefault(e => TextHelper.Normalize(e.Libelle).Contains("nouveau"))?.IDEtat
                         ?? etats.OrderBy(e => e.IDEtat).Select(e => (int?)e.IDEtat).FirstOrDefault();
            var superviseurId = await _context.Users
                .Where(u => u.IsActif && u.Role.Libelle == Roles.Superviseur)
                .OrderBy(u => u.ID).Select(u => (int?)u.ID).FirstOrDefaultAsync();

            if (defaultTypeId == null || urgenceId == null || panneId == null || etatId == null)
            {
                _logger.LogWarning("Preventive generation skipped: reference data (type, urgence, panne, état) is missing.");
                return results;
            }

            foreach (var plan in plans)
            {
                var echeance = plan.ProchaineEcheance.Date;

                // Missed occurrences (server stopped, plan resumed…) are not all generated:
                // jump to the latest occurrence that is already due.
                while (plan.NextAfter(echeance) <= today) echeance = plan.NextAfter(echeance);

                var inWindow = echeance.AddDays(-Math.Max(0, plan.DelaiGenerationJours)) <= today;
                if (!inWindow && !force) continue;

                var alreadyExists = await _context.DemandeInterventions.AnyAsync(d =>
                    d.IdPlanPreventif == plan.Id && d.IsActif && d.DatePlanifiee == echeance);
                if (alreadyExists)
                {
                    plan.ProchaineEcheance = plan.NextAfter(echeance);
                    continue;
                }

                var demandeurId = plan.CreeParId ?? actor?.Id ?? superviseurId;
                var chaineId = plan.Equipement.IdChaineProduction ?? chaineFallback;
                if (demandeurId == null || chaineId == null) continue;

                var technicienActif = plan.IdTechnicien.HasValue &&
                                      await _context.Users.AnyAsync(u => u.ID == plan.IdTechnicien && u.IsActif);

                var ot = new DemandeIntervention
                {
                    Titre = plan.Titre.Length > 100 ? plan.Titre[..100] : plan.Titre,
                    Description = string.IsNullOrWhiteSpace(plan.Description)
                        ? $"Maintenance préventive générée par le plan {plan.Code}."
                        : plan.Description,
                    DateCreation = DateTime.Now,
                    DatePlanifiee = echeance,
                    DureeEstimeeMinutes = plan.DureeEstimeeMinutes,
                    StatusId = DemandeInterventionController.StatusATraiter,
                    IDEtat = etatId.Value,
                    IDTypeIntervention = plan.IdTypeIntervention ?? defaultTypeId.Value,
                    IDUrgence = urgenceId.Value,
                    IDChaineProduction = chaineId.Value,
                    IDEquipement = plan.IdEquipement,
                    IDPanne = panneId.Value,
                    DemandeursID = demandeurId.Value,
                    DestinatairesID = technicienActif ? plan.IdTechnicien : null,
                    DateAssignation = technicienActif ? DateTime.Now : null,
                    MachineArretee = false,
                    IdPlanPreventif = plan.Id,
                    IsActif = true,
                    Taches = plan.Taches.OrderBy(t => t.Ordre)
                        .Select(t => new InterventionTache { Ordre = t.Ordre, Libelle = t.Libelle })
                        .ToList()
                };
                _context.DemandeInterventions.Add(ot);

                plan.DerniereGeneration = DateTime.Now;
                plan.ProchaineEcheance = plan.NextAfter(echeance);
                await _context.SaveChangesAsync();

                _journal.Add(actor, "Intervention", ot.IdDemandeIntervention, "Génération préventive",
                    $"Plan {plan.Code} — échéance du {echeance:dd/MM/yyyy}");
                if (ot.DestinatairesID.HasValue)
                {
                    await NotificationController.CreateNotificationAsync(_context, "Maintenance préventive planifiée",
                        $"« {ot.Titre} » est prévue le {echeance:dd/MM/yyyy}.", "intervention_assigned",
                        ot.DestinatairesID.Value, actor?.Id, ot.IdDemandeIntervention);
                }
                await _context.SaveChangesAsync();

                results.Add(new GenerationResult(plan.Id, plan.Code, ot.IdDemandeIntervention, echeance));
            }

            await _context.SaveChangesAsync();
            if (results.Count > 0)
                _logger.LogInformation("{Count} preventive work order(s) generated", results.Count);
            return results;
        }
    }

    /// <summary>Runs the preventive generation shortly after start-up, then every hour.</summary>
    public class PreventifHostedService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopes;
        private readonly ILogger<PreventifHostedService> _logger;

        public PreventifHostedService(IServiceScopeFactory scopes, ILogger<PreventifHostedService> logger)
        {
            _scopes = scopes;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            try
            {
                await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
                using var timer = new PeriodicTimer(TimeSpan.FromHours(1));
                do
                {
                    try
                    {
                        using var scope = _scopes.CreateScope();
                        var service = scope.ServiceProvider.GetRequiredService<IPreventifService>();
                        await service.GenerateDueAsync();
                    }
                    catch (Exception ex) when (ex is not OperationCanceledException)
                    {
                        _logger.LogError(ex, "Preventive generation failed");
                    }
                } while (await timer.WaitForNextTickAsync(stoppingToken));
            }
            catch (OperationCanceledException)
            {
                // shutting down
            }
        }
    }
}
