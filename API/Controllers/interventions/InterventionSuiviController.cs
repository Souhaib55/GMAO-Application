using API.Services;
using Core.Entities;
using Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using static API.Controllers.DemandeInterventionController;

namespace API.Controllers
{
    /// <summary>
    /// Execution of a work order: time spent, parts consumed (issued from the store),
    /// checklist, failure analysis and cost.
    ///
    /// Who may record work:
    ///   - the assigned technician while the job is "En cours";
    ///   - the supervisor until the job is closed or cancelled.
    /// Everyone allowed to see the request may read it.
    /// </summary>
    [ApiController]
    [Route("api/interventions/{id:int}")]
    public class InterventionSuiviController : ControllerBase
    {
        private readonly StoreContext _context;
        private readonly ICurrentUserService _currentUser;
        private readonly IStockService _stock;
        private readonly IJournalService _journal;

        public InterventionSuiviController(StoreContext context, ICurrentUserService currentUser, IStockService stock, IJournalService journal)
        {
            _context = context;
            _currentUser = currentUser;
            _stock = stock;
            _journal = journal;
        }

        private ObjectResult Forbidden(string message) => StatusCode(StatusCodes.Status403Forbidden, new { message });

        private static bool CanView(DemandeIntervention d, CurrentUser u) =>
            u.IsSuperviseur || d.DemandeursID == u.Id || d.DestinatairesID == u.Id;

        private static string? WriteDenied(DemandeIntervention d, CurrentUser u)
        {
            if (d.StatusId is StatusCloturee or StatusAnnulee) return "L'intervention est clôturée ou annulée.";
            if (u.IsSuperviseur) return null;
            if (u.IsTechnicien && d.DestinatairesID == u.Id)
                return d.StatusId == StatusEnCours ? null : "Prenez d'abord l'intervention en charge.";
            return "Seul le technicien affecté ou le superviseur peut saisir le suivi.";
        }

        private async Task<(DemandeIntervention? demande, CurrentUser? user, ActionResult? error)> LoadAsync(int id, bool write)
        {
            var user = await _currentUser.GetAsync();
            if (user == null) return (null, null, Unauthorized());
            var demande = await _context.DemandeInterventions.FirstOrDefaultAsync(d => d.IdDemandeIntervention == id && d.IsActif);
            if (demande == null) return (null, user, NotFound(new { message = "Intervention introuvable." }));
            if (!CanView(demande, user)) return (null, user, Forbidden("Accès refusé à cette intervention."));
            if (write)
            {
                var denied = WriteDenied(demande, user);
                if (denied != null) return (null, user, Forbidden(denied));
            }
            return (demande, user, null);
        }

        // ------------------------------------------------------------------
        // Overview
        // ------------------------------------------------------------------

        public static async Task<object> ComputeCostAsync(StoreContext context, int id)
        {
            var mainOeuvre = await context.InterventionTemps.Where(t => t.IdDemandeIntervention == id)
                .SumAsync(t => (decimal?)(t.DureeMinutes * (t.TauxHoraire ?? t.Technicien.TauxHoraire ?? 0) / 60m)) ?? 0;
            var pieces = await context.InterventionPieces.Where(p => p.IdDemandeIntervention == id)
                .SumAsync(p => (decimal?)(p.Quantite * p.PrixUnitaire)) ?? 0;
            var externe = await context.DemandeInterventions.Where(d => d.IdDemandeIntervention == id)
                .Select(d => d.CoutExterne).FirstOrDefaultAsync() ?? 0;
            var minutes = await context.InterventionTemps.Where(t => t.IdDemandeIntervention == id).SumAsync(t => (int?)t.DureeMinutes) ?? 0;
            return new
            {
                mainOeuvre = Math.Round(mainOeuvre, 3),
                pieces = Math.Round(pieces, 3),
                externe = Math.Round(externe, 3),
                total = Math.Round(mainOeuvre + pieces + externe, 3),
                heures = Math.Round(minutes / 60.0, 2)
            };
        }

        [HttpGet("suivi")]
        public async Task<ActionResult<object>> GetSuivi(int id)
        {
            var (demande, user, error) = await LoadAsync(id, write: false);
            if (error != null) return error;

            var temps = await _context.InterventionTemps.AsNoTracking()
                .Where(t => t.IdDemandeIntervention == id)
                .OrderBy(t => t.Debut)
                .Select(t => new
                {
                    t.Id, t.Debut, t.Fin, t.DureeMinutes, t.Commentaire, t.IdTechnicien,
                    Technicien = t.Technicien.Prenom + " " + t.Technicien.Nom,
                    TauxHoraire = t.TauxHoraire ?? t.Technicien.TauxHoraire
                })
                .ToListAsync();

            var pieces = await _context.InterventionPieces.AsNoTracking()
                .Where(p => p.IdDemandeIntervention == id)
                .OrderBy(p => p.Date)
                .Select(p => new { p.Id, p.IdPiece, p.Piece.CodePiece, p.Piece.Designation, p.Piece.Unite, p.Quantite, p.PrixUnitaire, p.Date, Montant = p.Quantite * p.PrixUnitaire })
                .ToListAsync();

            var taches = await _context.InterventionTaches.AsNoTracking()
                .Where(t => t.IdDemandeIntervention == id)
                .OrderBy(t => t.Ordre)
                .Select(t => new { t.Id, t.Ordre, t.Libelle, t.Fait, t.DateFait })
                .ToListAsync();

            var journal = await _context.JournalActivites.AsNoTracking()
                .Where(j => j.Entite == "Intervention" && j.EntiteId == id)
                .OrderByDescending(j => j.Date)
                .Take(50)
                .Select(j => new { j.Date, j.UtilisateurNom, j.Action, j.Details })
                .ToListAsync();

            var plan = demande!.IdPlanPreventif.HasValue
                ? await _context.PlansPreventifs.AsNoTracking().Where(p => p.Id == demande.IdPlanPreventif)
                    .Select(p => new { p.Id, p.Code, p.Titre }).FirstOrDefaultAsync()
                : null;

            return Ok(new
            {
                demande.DatePlanifiee,
                demande.DureeEstimeeMinutes,
                demande.Cause,
                demande.Remede,
                demande.CoutExterne,
                plan,
                temps,
                pieces,
                taches,
                cout = await ComputeCostAsync(_context, id),
                journal,
                demande.StatusId,
                estTechnicienAffecte = demande.DestinatairesID == user!.Id && user.IsTechnicien,
                estSuperviseur = user.IsSuperviseur,
                compteRendu = demande.CompteRendu,
                peutSaisir = WriteDenied(demande, user!) == null,
                peutPlanifier = user!.IsSuperviseur && demande.StatusId is not (StatusCloturee or StatusAnnulee)
            });
        }

        // ------------------------------------------------------------------
        // Time spent
        // ------------------------------------------------------------------

        public class TempsDto
        {
            public int? IdTechnicien { get; set; }
            public DateTime Debut { get; set; }
            public DateTime? Fin { get; set; }
            public int? DureeMinutes { get; set; }
            public string? Commentaire { get; set; }
        }

        [HttpPost("temps")]
        public async Task<ActionResult> AddTemps(int id, [FromBody] TempsDto dto)
        {
            var (demande, user, error) = await LoadAsync(id, write: true);
            if (error != null) return error;

            // Technicians log their own time; the supervisor may log for any technician
            var techId = user!.IsSuperviseur ? dto.IdTechnicien ?? demande!.DestinatairesID ?? user.Id : user.Id;
            var tech = await _context.Users.FirstOrDefaultAsync(u => u.ID == techId && u.IsActif);
            if (tech == null) return BadRequest(new { message = "Technicien invalide." });

            int minutes;
            if (dto.Fin.HasValue)
            {
                if (dto.Fin <= dto.Debut) return BadRequest(new { message = "L'heure de fin doit être après l'heure de début." });
                minutes = (int)Math.Round((dto.Fin.Value - dto.Debut).TotalMinutes);
            }
            else
            {
                minutes = dto.DureeMinutes ?? 0;
            }
            if (minutes <= 0 || minutes > 24 * 60) return BadRequest(new { message = "La durée doit être comprise entre 1 minute et 24 heures." });
            var fin = dto.Debut.AddMinutes(minutes);
            if (fin > DateTime.Now.AddMinutes(5)) return BadRequest(new { message = "Le temps passé ne peut pas se terminer dans le futur." });
            // Small tolerance: a technician may start before the request is typed in
            if (dto.Debut < demande!.DateCreation.AddHours(-2)) return BadRequest(new { message = "Le temps passé ne peut pas précéder la déclaration de la demande." });

            // A technician cannot be in two places at once
            var chevauchement = await _context.InterventionTemps.AsNoTracking()
                .Where(t => t.IdTechnicien == tech.ID && t.Debut < fin && (t.Fin ?? t.Debut.AddMinutes(t.DureeMinutes)) > dto.Debut)
                .Select(t => new { t.IdDemandeIntervention, t.Debut })
                .FirstOrDefaultAsync();
            if (chevauchement != null)
                return BadRequest(new { message = $"Cette période chevauche une saisie existante de {tech.Prenom} {tech.Nom} (INT-{chevauchement.IdDemandeIntervention:0000}, {chevauchement.Debut:dd/MM HH:mm})." });
            if (dto.Commentaire?.Length > 500) return BadRequest(new { message = "Le commentaire ne doit pas dépasser 500 caractères." });

            _context.InterventionTemps.Add(new InterventionTemps
            {
                IdDemandeIntervention = id,
                IdTechnicien = tech.ID,
                Debut = dto.Debut,
                Fin = dto.Fin ?? dto.Debut.AddMinutes(minutes),
                DureeMinutes = minutes,
                TauxHoraire = tech.TauxHoraire,
                Commentaire = string.IsNullOrWhiteSpace(dto.Commentaire) ? null : dto.Commentaire.Trim(),
                DateSaisie = DateTime.Now
            });
            _journal.Add(user, "Intervention", id, "Temps saisi", $"{minutes / 60}h{minutes % 60:00} — {tech.Prenom} {tech.Nom}");
            await _context.SaveChangesAsync();
            return Ok();
        }

        [HttpDelete("temps/{tempsId:int}")]
        public async Task<ActionResult> DeleteTemps(int id, int tempsId)
        {
            var (_, user, error) = await LoadAsync(id, write: true);
            if (error != null) return error;
            var entry = await _context.InterventionTemps.FirstOrDefaultAsync(t => t.Id == tempsId && t.IdDemandeIntervention == id);
            if (entry == null) return NotFound(new { message = "Saisie introuvable." });
            if (!user!.IsSuperviseur && entry.IdTechnicien != user.Id) return Forbidden("Vous ne pouvez supprimer que vos propres saisies.");
            _context.InterventionTemps.Remove(entry);
            _journal.Add(user, "Intervention", id, "Temps supprimé", $"{entry.DureeMinutes} min");
            await _context.SaveChangesAsync();
            return Ok();
        }

        // ------------------------------------------------------------------
        // Parts consumed (issued from the store)
        // ------------------------------------------------------------------

        public class PieceDto
        {
            public int IdPiece { get; set; }
            public int Quantite { get; set; }
        }

        [HttpPost("pieces")]
        public async Task<ActionResult> AddPiece(int id, [FromBody] PieceDto dto)
        {
            var (_, user, error) = await LoadAsync(id, write: true);
            if (error != null) return error;
            if (dto.Quantite <= 0 || dto.Quantite > 10000) return BadRequest(new { message = "Quantité invalide." });

            var piece = await _context.Pieces.AsNoTracking().FirstOrDefaultAsync(p => p.IDPiece == dto.IdPiece && p.IsActif);
            if (piece == null) return BadRequest(new { message = "Article introuvable ou désactivé." });

            await using var tx = await _context.Database.BeginTransactionAsync();
            var (mouvement, stockError) = await _stock.ApplyAsync(new StockRequest(piece.IDPiece, -dto.Quantite, MouvementStock.TypeSortie,
                $"Consommation intervention INT-{id:0000}", piece.PrixUnitaire, user!.Id, id));
            if (stockError != null) return BadRequest(new { message = stockError });

            _context.InterventionPieces.Add(new InterventionPiece
            {
                IdDemandeIntervention = id,
                IdPiece = piece.IDPiece,
                Quantite = dto.Quantite,
                PrixUnitaire = piece.PrixUnitaire,
                Date = DateTime.Now,
                IdMouvementStock = mouvement!.Id
            });
            _journal.Add(user, "Intervention", id, "Pièce consommée", $"{dto.Quantite} × {piece.CodePiece} {piece.Designation}");
            await _context.SaveChangesAsync();
            await tx.CommitAsync();
            return Ok(new { stockRestant = mouvement.StockApres });
        }

        /// <summary>Removes a consumption line and returns the parts to the store.</summary>
        [HttpDelete("pieces/{ligneId:int}")]
        public async Task<ActionResult> DeletePiece(int id, int ligneId)
        {
            var (_, user, error) = await LoadAsync(id, write: true);
            if (error != null) return error;
            var ligne = await _context.InterventionPieces.Include(p => p.Piece).FirstOrDefaultAsync(p => p.Id == ligneId && p.IdDemandeIntervention == id);
            if (ligne == null) return NotFound(new { message = "Ligne introuvable." });

            await using var tx = await _context.Database.BeginTransactionAsync();
            var (_, stockError) = await _stock.ApplyAsync(new StockRequest(ligne.IdPiece, ligne.Quantite, MouvementStock.TypeEntree,
                $"Retour au magasin — intervention INT-{id:0000}", ligne.PrixUnitaire, user!.Id, id, AutoriserNegatif: true));
            if (stockError != null) return BadRequest(new { message = stockError });
            _context.InterventionPieces.Remove(ligne);
            _journal.Add(user, "Intervention", id, "Pièce retournée", $"{ligne.Quantite} × {ligne.Piece.CodePiece}");
            await _context.SaveChangesAsync();
            await tx.CommitAsync();
            return Ok();
        }

        // ------------------------------------------------------------------
        // Checklist
        // ------------------------------------------------------------------

        public class TacheDto
        {
            public string? Libelle { get; set; }
        }

        [HttpPost("taches")]
        public async Task<ActionResult> AddTache(int id, [FromBody] TacheDto dto)
        {
            var (_, user, error) = await LoadAsync(id, write: true);
            if (error != null) return error;
            var libelle = dto.Libelle?.Trim();
            if (string.IsNullOrWhiteSpace(libelle) || libelle.Length > 255) return BadRequest(new { message = "Libellé obligatoire (255 caractères maximum)." });
            var ordre = (await _context.InterventionTaches.Where(t => t.IdDemandeIntervention == id).MaxAsync(t => (int?)t.Ordre) ?? 0) + 1;
            _context.InterventionTaches.Add(new InterventionTache { IdDemandeIntervention = id, Ordre = ordre, Libelle = libelle });
            await _context.SaveChangesAsync();
            return Ok();
        }

        [HttpPatch("taches/{tacheId:int}")]
        public async Task<ActionResult> ToggleTache(int id, int tacheId, [FromQuery] bool fait)
        {
            var (_, user, error) = await LoadAsync(id, write: true);
            if (error != null) return error;
            var tache = await _context.InterventionTaches.FirstOrDefaultAsync(t => t.Id == tacheId && t.IdDemandeIntervention == id);
            if (tache == null) return NotFound(new { message = "Étape introuvable." });
            tache.Fait = fait;
            tache.DateFait = fait ? DateTime.Now : null;
            tache.FaitParId = fait ? user!.Id : null;
            await _context.SaveChangesAsync();
            return Ok();
        }

        [HttpDelete("taches/{tacheId:int}")]
        public async Task<ActionResult> DeleteTache(int id, int tacheId)
        {
            var (_, _, error) = await LoadAsync(id, write: true);
            if (error != null) return error;
            var tache = await _context.InterventionTaches.FirstOrDefaultAsync(t => t.Id == tacheId && t.IdDemandeIntervention == id);
            if (tache == null) return NotFound(new { message = "Étape introuvable." });
            _context.InterventionTaches.Remove(tache);
            await _context.SaveChangesAsync();
            return Ok();
        }

        // ------------------------------------------------------------------
        // Analysis and planning
        // ------------------------------------------------------------------

        public class AnalyseDto
        {
            public string? Cause { get; set; }
            public string? Remede { get; set; }
            public decimal? CoutExterne { get; set; }
            // Supervisor only
            public DateTime? DatePlanifiee { get; set; }
            public int? DureeEstimeeMinutes { get; set; }
        }

        [HttpPut("analyse")]
        public async Task<ActionResult> SaveAnalyse(int id, [FromBody] AnalyseDto dto)
        {
            var (demande, user, error) = await LoadAsync(id, write: true);
            if (error != null) return error;
            if (dto.Cause?.Length > 500 || dto.Remede?.Length > 500) return BadRequest(new { message = "500 caractères maximum pour la cause et le remède." });
            if (dto.CoutExterne is < 0 or > 10_000_000) return BadRequest(new { message = "Coût externe invalide." });
            if (dto.DureeEstimeeMinutes is < 0 or > 10080) return BadRequest(new { message = "Durée estimée invalide." });

            demande!.Cause = string.IsNullOrWhiteSpace(dto.Cause) ? null : dto.Cause.Trim();
            demande.Remede = string.IsNullOrWhiteSpace(dto.Remede) ? null : dto.Remede.Trim();
            demande.CoutExterne = dto.CoutExterne;
            if (user!.IsSuperviseur)
            {
                demande.DatePlanifiee = dto.DatePlanifiee?.Date;
                demande.DureeEstimeeMinutes = dto.DureeEstimeeMinutes;
            }
            _journal.Add(user, "Intervention", id, "Analyse mise à jour");
            await _context.SaveChangesAsync();
            return Ok();
        }
    }
}
