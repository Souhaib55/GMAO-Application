using API.Services;
using Core.Entities;
using Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using static API.Controllers.DemandeInterventionController;

namespace API.Controllers
{
    /// <summary>
    /// 360° view of a machine: reliability figures over 12 months, full work order
    /// history, preventive plans, parts consumed, cost and documents.
    /// Downtime follows the same rule as the KPI dashboard: requests that stopped the
    /// machine count from their creation to their completion (or now).
    /// </summary>
    [Authorize(Roles = Roles.Superviseur + "," + Roles.Technicien)]
    [ApiController]
    [Route("api/equipment/{id:int}/historique")]
    public class EquipementHistoriqueController : ControllerBase
    {
        private readonly StoreContext _context;

        public EquipementHistoriqueController(StoreContext context) => _context = context;

        [HttpGet]
        public async Task<ActionResult<object>> Get(int id)
        {
            var equipement = await _context.Equipments.AsNoTracking()
                .Where(e => e.IdEquipement == id)
                .Select(e => new
                {
                    e.IdEquipement, e.CodeEquipement, e.Designation, e.Emplacement, e.NumeroSerie, e.DateMiseEnService,
                    e.DateFinGarantie, e.CoutAchat, e.IsDeleted,
                    Chaine = e.ChaineProduction != null ? e.ChaineProduction.Libelle : null,
                    Etat = e.Etat != null ? e.Etat.NomEtat : null,
                    Criticite = e.Criticite != null ? e.Criticite.NomCriticite : null,
                    Fournisseur = e.Fournisseur != null ? e.Fournisseur.Nom : null
                })
                .FirstOrDefaultAsync();
            if (equipement == null) return NotFound(new { message = "Équipement introuvable." });

            var now = DateTime.Now;
            var from = now.AddMonths(-12);

            var ots = await _context.DemandeInterventions.AsNoTracking()
                .Where(d => d.IDEquipement == id && d.IsActif)
                .OrderByDescending(d => d.DateCreation)
                .Select(d => new
                {
                    d.IdDemandeIntervention, d.Titre, d.DateCreation, d.DatePlanifiee, d.DatePriseEnCharge, d.DateRealisation,
                    d.StatusId, Statut = d.Status.Statut, Type = d.TypeIntervention.Libelle, Panne = d.Panne.Libelle,
                    Urgence = d.Urgence.Libelle, d.MachineArretee, d.Cause, d.Remede, d.IdPlanPreventif,
                    Technicien = d.Destinataire != null ? d.Destinataire.Prenom + " " + d.Destinataire.Nom : null,
                    CoutMainOeuvre = d.Temps.Sum(t => (decimal?)(t.DureeMinutes * (t.TauxHoraire ?? t.Technicien.TauxHoraire ?? 0) / 60m)) ?? 0,
                    CoutPieces = d.PiecesConsommees.Sum(p => (decimal?)(p.Quantite * p.PrixUnitaire)) ?? 0,
                    CoutExterne = d.CoutExterne ?? 0
                })
                .ToListAsync();

            double Downtime(DateTime created, DateTime? done)
            {
                var start = created < from ? from : created;
                var end = done ?? now;
                return end > start ? (end - start).TotalHours : 0;
            }

            var annule = StatusAnnulee;
            var periode = ots.Where(o => o.StatusId != annule && (o.DateCreation >= from || (o.DateRealisation ?? now) >= from)).ToList();
            var pannes = periode.Where(o => o.MachineArretee && o.DateCreation >= from).ToList();
            var arret = periode.Where(o => o.MachineArretee).Sum(o => Downtime(o.DateCreation, o.DateRealisation));
            var heures = (now - from).TotalHours;
            var reparations = pannes.Where(o => o.DateRealisation.HasValue && o.DatePriseEnCharge.HasValue).ToList();

            var piecesConsommees = await _context.InterventionPieces.AsNoTracking()
                .Where(p => p.DemandeIntervention.IDEquipement == id)
                .GroupBy(p => new { p.IdPiece, p.Piece.CodePiece, p.Piece.Designation, p.Piece.Unite })
                .Select(g => new { g.Key.IdPiece, g.Key.CodePiece, g.Key.Designation, g.Key.Unite, Quantite = g.Sum(p => p.Quantite), Montant = g.Sum(p => p.Quantite * p.PrixUnitaire), Derniere = g.Max(p => p.Date) })
                .OrderByDescending(x => x.Montant)
                .Take(15)
                .ToListAsync();

            var plans = await _context.PlansPreventifs.AsNoTracking()
                .Where(p => p.IdEquipement == id)
                .OrderBy(p => p.ProchaineEcheance)
                .Select(p => new { p.Id, p.Code, p.Titre, p.Frequence, p.Intervalle, p.ProchaineEcheance, p.IsActif })
                .ToListAsync();

            var documents = await _context.PiecesJointes.AsNoTracking()
                .CountAsync(p => p.Entite == PieceJointe.EntiteEquipement && p.EntiteId == id);

            var cout12 = ots.Where(o => o.DateCreation >= from).Sum(o => o.CoutMainOeuvre + o.CoutPieces + o.CoutExterne);
            var pannesParType = pannes.GroupBy(o => o.Panne).Select(g => new { panne = g.Key, nombre = g.Count() }).OrderByDescending(x => x.nombre).ToList();

            return Ok(new
            {
                equipement,
                indicateurs = new
                {
                    interventions12Mois = periode.Count(o => o.DateCreation >= from),
                    pannes12Mois = pannes.Count,
                    heuresArret = Math.Round(arret, 1),
                    disponibilite = Math.Round(Math.Clamp(100 * (1 - arret / heures), 0, 100), 1),
                    mtbfHeures = pannes.Count > 0 ? Math.Round((heures - arret) / pannes.Count, 0) : (double?)null,
                    mttrHeures = reparations.Count > 0 ? Math.Round(reparations.Average(o => (o.DateRealisation!.Value - o.DatePriseEnCharge!.Value).TotalHours), 1) : (double?)null,
                    cout12Mois = Math.Round(cout12, 3),
                    coutTotal = Math.Round(ots.Sum(o => o.CoutMainOeuvre + o.CoutPieces + o.CoutExterne), 3),
                    otOuverts = ots.Count(o => o.StatusId <= StatusEnCours),
                    dernierepanne = pannes.OrderByDescending(o => o.DateCreation).Select(o => (DateTime?)o.DateCreation).FirstOrDefault()
                },
                pannesParType,
                interventions = ots.Take(100).Select(o => new
                {
                    o.IdDemandeIntervention, o.Titre, o.DateCreation, o.DatePlanifiee, o.DateRealisation, o.StatusId, o.Statut, o.Type,
                    o.Panne, o.Urgence, o.MachineArretee, o.Cause, o.Remede, o.Technicien, o.IdPlanPreventif,
                    Cout = Math.Round(o.CoutMainOeuvre + o.CoutPieces + o.CoutExterne, 3),
                    DureeArretHeures = o.MachineArretee && o.StatusId != annule ? Math.Round(((o.DateRealisation ?? now) - o.DateCreation).TotalHours, 1) : (double?)null
                }),
                plans,
                piecesConsommees,
                documents
            });
        }
    }
}
