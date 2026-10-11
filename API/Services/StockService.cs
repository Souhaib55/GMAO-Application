using Core.Entities;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace API.Services
{
    public sealed record StockRequest(
        int IdPiece,
        int Quantite,               // signed: + entry, - issue
        string Type,
        string? Motif = null,
        decimal? PrixUnitaire = null,
        int? UtilisateurId = null,
        int? IdDemandeIntervention = null,
        int? IdBonCommande = null,
        bool AutoriserNegatif = false);

    public interface IStockService
    {
        /// <summary>
        /// Changes an article's quantity and records the movement. The quantity is
        /// updated with a single conditional UPDATE so two concurrent issues can never
        /// take the stock below zero. Call inside a transaction when other changes
        /// must succeed or fail together with the movement.
        /// </summary>
        Task<(MouvementStock? mouvement, string? erreur)> ApplyAsync(StockRequest request);
    }

    public class StockService : IStockService
    {
        private readonly StoreContext _context;

        public StockService(StoreContext context) => _context = context;

        public async Task<(MouvementStock? mouvement, string? erreur)> ApplyAsync(StockRequest r)
        {
            if (r.Quantite == 0) return (null, "La quantité doit être différente de zéro.");

            var piece = await _context.Pieces.AsNoTracking()
                .Where(p => p.IDPiece == r.IdPiece)
                .Select(p => new { p.IDPiece, p.Designation, p.IsActif, p.PrixUnitaire })
                .FirstOrDefaultAsync();
            if (piece == null) return (null, "Article introuvable.");
            if (!piece.IsActif && r.Quantite < 0) return (null, $"L'article « {piece.Designation} » est désactivé.");

            var delta = r.Quantite;
            var updated = r.AutoriserNegatif
                ? await _context.Pieces.Where(p => p.IDPiece == r.IdPiece)
                    .ExecuteUpdateAsync(s => s.SetProperty(p => p.Quantite_Stock, p => p.Quantite_Stock + delta)
                                              .SetProperty(p => p.DateModification, DateTime.Now))
                : await _context.Pieces.Where(p => p.IDPiece == r.IdPiece && p.Quantite_Stock + delta >= 0)
                    .ExecuteUpdateAsync(s => s.SetProperty(p => p.Quantite_Stock, p => p.Quantite_Stock + delta)
                                              .SetProperty(p => p.DateModification, DateTime.Now));

            if (updated == 0)
            {
                var disponible = await _context.Pieces.Where(p => p.IDPiece == r.IdPiece).Select(p => p.Quantite_Stock).FirstAsync();
                return (null, $"Stock insuffisant pour « {piece.Designation} » : {disponible} disponible(s), {-delta} demandé(s).");
            }

            var stockApres = await _context.Pieces.Where(p => p.IDPiece == r.IdPiece).Select(p => p.Quantite_Stock).FirstAsync();

            // Keep the tracked entity (if any) in line with the database
            var tracked = _context.ChangeTracker.Entries<Piece>().FirstOrDefault(e => e.Entity.IDPiece == r.IdPiece);
            if (tracked != null)
            {
                tracked.Entity.Quantite_Stock = stockApres;
                tracked.Property(p => p.Quantite_Stock).IsModified = false;
            }

            var mouvement = new MouvementStock
            {
                IdPiece = r.IdPiece,
                Type = r.Type,
                Quantite = delta,
                StockApres = stockApres,
                PrixUnitaire = r.PrixUnitaire ?? piece.PrixUnitaire,
                Date = DateTime.Now,
                Motif = string.IsNullOrWhiteSpace(r.Motif) ? null : r.Motif.Trim(),
                UtilisateurId = r.UtilisateurId,
                IdDemandeIntervention = r.IdDemandeIntervention,
                IdBonCommande = r.IdBonCommande
            };
            _context.MouvementsStock.Add(mouvement);
            await _context.SaveChangesAsync();
            return (mouvement, null);
        }
    }
}
