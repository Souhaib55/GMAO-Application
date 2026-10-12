using Core.Entities;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using static API.Controllers.DemandeInterventionController;

namespace API.Services
{
    /// <summary>
    /// Consequences of a work-order change that must stay consistent everywhere:
    ///  - the machine's state follows its open breakdowns ("En panne" while one is open);
    ///  - parts issued to a cancelled or deleted work order go back to the store;
    ///  - every workflow step is written to the audit trail.
    /// </summary>
    public interface IInterventionEffectsService
    {
        Task SyncEquipmentStateAsync(params int?[] equipementIds);
        Task<int> ReturnPartsAsync(int interventionId, int? userId, string motif);
        void Audit(int? userId, string? userName, int interventionId, string action, string? details = null);
    }

    public class InterventionEffectsService : IInterventionEffectsService
    {
        private readonly StoreContext _context;
        private readonly IStockService _stock;

        public InterventionEffectsService(StoreContext context, IStockService stock)
        {
            _context = context;
            _stock = stock;
        }

        public async Task SyncEquipmentStateAsync(params int?[] equipementIds)
        {
            var ids = equipementIds.Where(i => i.HasValue).Select(i => i!.Value).Distinct().ToList();
            if (ids.Count == 0) return;

            var etats = await _context.EtatEquipements.Where(e => e.IsActif).ToListAsync();
            var enPanne = etats.FirstOrDefault(e => TextHelper.Normalize(e.NomEtat).Contains("panne"));
            var enService = etats.FirstOrDefault(e => TextHelper.Normalize(e.NomEtat).Contains("service"));
            if (enPanne == null || enService == null) return;

            foreach (var id in ids)
            {
                var machine = await _context.Equipments.FirstOrDefaultAsync(e => e.IdEquipement == id && !e.IsDeleted);
                if (machine == null) continue;
                var stopped = await _context.DemandeInterventions.AnyAsync(d => d.IsActif && d.IDEquipement == id && d.MachineArretee &&
                    (d.StatusId == StatusATraiter || d.StatusId == StatusEnCours));

                // Only the breakdown state is driven automatically; other states ("En maintenance",
                // "Réformé"…) are a supervisor's decision and are left alone.
                if (stopped && machine.IdEtat != enPanne.IdEtat && (machine.IdEtat == null || machine.IdEtat == enService.IdEtat))
                    machine.IdEtat = enPanne.IdEtat;
                else if (!stopped && machine.IdEtat == enPanne.IdEtat)
                    machine.IdEtat = enService.IdEtat;
            }
            await _context.SaveChangesAsync();
        }

        public async Task<int> ReturnPartsAsync(int interventionId, int? userId, string motif)
        {
            var lignes = await _context.InterventionPieces.Where(p => p.IdDemandeIntervention == interventionId).ToListAsync();
            foreach (var l in lignes)
            {
                var (_, error) = await _stock.ApplyAsync(new StockRequest(l.IdPiece, l.Quantite, MouvementStock.TypeEntree,
                    $"{motif} — INT-{interventionId:0000}", l.PrixUnitaire, userId, interventionId, AutoriserNegatif: true));
                if (error != null) throw new InvalidOperationException(error);
            }
            _context.InterventionPieces.RemoveRange(lignes);
            await _context.SaveChangesAsync();
            return lignes.Sum(l => l.Quantite);
        }

        public void Audit(int? userId, string? userName, int interventionId, string action, string? details = null)
        {
            _context.JournalActivites.Add(new JournalActivite
            {
                Date = DateTime.Now,
                UtilisateurId = userId,
                UtilisateurNom = userName ?? "Système",
                Entite = "Intervention",
                EntiteId = interventionId,
                Action = action,
                Details = details is { Length: > 1000 } ? details[..1000] : details
            });
        }
    }
}
