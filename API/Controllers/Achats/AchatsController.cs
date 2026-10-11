using API.Services;
using Core.Entities;
using Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace API.Controllers
{
    /// <summary>
    /// Purchasing: purchase requests (DA) raised by technicians or the supervisor,
    /// approved by the supervisor, turned into purchase orders (BC) sent to a supplier;
    /// receiving a BC adds the quantities to the store.
    /// </summary>
    [ApiController]
    [Route("api/achats")]
    public class AchatsController : ControllerBase
    {
        private readonly StoreContext _context;
        private readonly ICurrentUserService _currentUser;
        private readonly IStockService _stock;
        private readonly IJournalService _journal;

        public AchatsController(StoreContext context, ICurrentUserService currentUser, IStockService stock, IJournalService journal)
        {
            _context = context;
            _currentUser = currentUser;
            _stock = stock;
            _journal = journal;
        }

        private ObjectResult Forbidden(string message) => StatusCode(StatusCodes.Status403Forbidden, new { message });

        private async Task<string> NextNumeroAsync(string prefix, IQueryable<string> numeros)
        {
            var annee = DateTime.Today.Year;
            var start = $"{prefix}-{annee}-";
            var last = await numeros.Where(n => n.StartsWith(start)).OrderByDescending(n => n).FirstOrDefaultAsync();
            var seq = last != null && int.TryParse(last[start.Length..], out var n) ? n + 1 : 1;
            return $"{start}{seq:0000}";
        }

        // ------------------------------------------------------------------
        // Purchase requests (DA)
        // ------------------------------------------------------------------

        [HttpGet("demandes")]
        [Authorize(Roles = Roles.Superviseur + "," + Roles.Technicien)]
        public async Task<ActionResult<object>> GetDemandes(string? statut = null)
        {
            var user = await _currentUser.GetAsync();
            if (user == null) return Unauthorized();
            var query = _context.DemandesAchat.AsNoTracking().AsQueryable();
            if (!user.IsSuperviseur) query = query.Where(d => d.IdDemandeur == user.Id);
            if (!string.IsNullOrWhiteSpace(statut)) query = query.Where(d => d.Statut == statut);

            return Ok(await query.OrderByDescending(d => d.DateDemande).Take(300).Select(d => new
            {
                d.Id, d.Numero, d.DateDemande, d.Statut, d.Motif, d.IdDemandeIntervention, d.DateDecision, d.CommentaireDecision,
                Demandeur = d.Demandeur.Prenom + " " + d.Demandeur.Nom,
                Lignes = d.Lignes.Select(l => new { l.Id, l.IdPiece, l.Designation, l.Quantite, l.PrixEstime, Code = l.Piece != null ? l.Piece.CodePiece : null }).ToList(),
                MontantEstime = d.Lignes.Sum(l => (decimal?)(l.Quantite * (l.PrixEstime ?? 0))) ?? 0,
                BonCommande = _context.BonsCommande.Where(b => b.IdDemandeAchat == d.Id).Select(b => new { b.Id, b.Numero }).FirstOrDefault()
            }).ToListAsync());
        }

        public class LigneDto
        {
            public int? IdPiece { get; set; }
            public string? Designation { get; set; }
            public int Quantite { get; set; }
            public decimal? Prix { get; set; }
        }

        public class DemandeAchatDto
        {
            public string? Motif { get; set; }
            public int? IdDemandeIntervention { get; set; }
            public List<LigneDto> Lignes { get; set; } = new();
        }

        private async Task<(List<(int? idPiece, string designation, int quantite, decimal? prix)>? lignes, string? error)> ValidateLinesAsync(List<LigneDto> input, bool prixObligatoire)
        {
            if (input.Count == 0) return (null, "Ajoutez au moins une ligne.");
            if (input.Count > 100) return (null, "100 lignes au maximum.");
            var result = new List<(int?, string, int, decimal?)>();
            foreach (var l in input)
            {
                if (l.Quantite <= 0 || l.Quantite > 100000) return (null, "Chaque ligne doit avoir une quantité positive.");
                if (l.Prix is < 0) return (null, "Le prix ne peut pas être négatif.");
                if (prixObligatoire && l.Prix is null) return (null, "Indiquez le prix unitaire de chaque ligne.");
                string designation;
                if (l.IdPiece.HasValue)
                {
                    var piece = await _context.Pieces.AsNoTracking().Where(p => p.IDPiece == l.IdPiece && p.IsActif)
                        .Select(p => new { p.Designation }).FirstOrDefaultAsync();
                    if (piece == null) return (null, "Un article de la commande est introuvable ou désactivé.");
                    designation = string.IsNullOrWhiteSpace(l.Designation) ? piece.Designation : l.Designation.Trim();
                }
                else
                {
                    designation = l.Designation?.Trim() ?? "";
                    if (designation.Length < 2) return (null, "Chaque ligne hors catalogue doit avoir une désignation.");
                }
                if (designation.Length > 150) designation = designation[..150];
                result.Add((l.IdPiece, designation, l.Quantite, l.Prix));
            }
            return (result, null);
        }

        [HttpPost("demandes")]
        [Authorize(Roles = Roles.Superviseur + "," + Roles.Technicien)]
        public async Task<ActionResult<object>> CreateDemande([FromBody] DemandeAchatDto dto)
        {
            var user = await _currentUser.GetAsync();
            if (user == null) return Unauthorized();
            if (dto.Motif?.Length > 1000) return BadRequest(new { message = "Le motif ne doit pas dépasser 1000 caractères." });
            if (dto.IdDemandeIntervention.HasValue && !await _context.DemandeInterventions.AnyAsync(d => d.IdDemandeIntervention == dto.IdDemandeIntervention && d.IsActif))
                return BadRequest(new { message = "Intervention invalide." });
            var (lignes, error) = await ValidateLinesAsync(dto.Lignes, prixObligatoire: false);
            if (error != null) return BadRequest(new { message = error });

            var da = new DemandeAchat
            {
                Numero = await NextNumeroAsync("DA", _context.DemandesAchat.Select(d => d.Numero)),
                DateDemande = DateTime.Now,
                IdDemandeur = user.Id,
                Statut = DemandeAchat.StatutSoumise,
                Motif = string.IsNullOrWhiteSpace(dto.Motif) ? null : dto.Motif.Trim(),
                IdDemandeIntervention = dto.IdDemandeIntervention,
                Lignes = lignes!.Select(l => new DemandeAchatLigne { IdPiece = l.idPiece, Designation = l.designation, Quantite = l.quantite, PrixEstime = l.prix }).ToList()
            };
            _context.DemandesAchat.Add(da);
            await _context.SaveChangesAsync();
            _journal.Add(user, "DemandeAchat", da.Id, "Création", da.Numero);
            await _context.SaveChangesAsync();

            if (!user.IsSuperviseur)
            {
                var supervisors = await _context.Users.Where(u => u.IsActif && u.Role.Libelle == Roles.Superviseur).Select(u => u.ID).ToListAsync();
                foreach (var s in supervisors)
                    await NotificationController.CreateNotificationAsync(_context, "Nouvelle demande d'achat",
                        $"{da.Numero} soumise par {user.NomComplet}.", "achat_demande", s, user.Id);
            }
            return Ok(new { da.Id, da.Numero });
        }

        public class DecisionDto
        {
            public bool Approuver { get; set; }
            public string? Commentaire { get; set; }
        }

        [HttpPost("demandes/{id:int}/decision")]
        [Authorize(Roles = Roles.Superviseur)]
        public async Task<ActionResult> Decide(int id, [FromBody] DecisionDto dto)
        {
            var user = await _currentUser.GetAsync();
            var da = await _context.DemandesAchat.FirstOrDefaultAsync(d => d.Id == id);
            if (da == null) return NotFound(new { message = "Demande introuvable." });
            if (da.Statut != DemandeAchat.StatutSoumise) return BadRequest(new { message = "Cette demande a déjà été traitée." });
            if (!dto.Approuver && string.IsNullOrWhiteSpace(dto.Commentaire)) return BadRequest(new { message = "Indiquez le motif du refus." });
            if (dto.Commentaire?.Length > 500) return BadRequest(new { message = "500 caractères maximum." });

            da.Statut = dto.Approuver ? DemandeAchat.StatutApprouvee : DemandeAchat.StatutRejetee;
            da.DateDecision = DateTime.Now;
            da.IdDecideur = user?.Id;
            da.CommentaireDecision = string.IsNullOrWhiteSpace(dto.Commentaire) ? null : dto.Commentaire.Trim();
            _journal.Add(user, "DemandeAchat", id, dto.Approuver ? "Approbation" : "Refus", da.CommentaireDecision);
            await _context.SaveChangesAsync();
            if (da.IdDemandeur != user?.Id)
                await NotificationController.CreateNotificationAsync(_context, dto.Approuver ? "Demande d'achat approuvée" : "Demande d'achat refusée",
                    $"{da.Numero} : {(dto.Approuver ? "approuvée" : "refusée")}.", "achat_decision", da.IdDemandeur, user?.Id);
            return Ok();
        }

        // ------------------------------------------------------------------
        // Purchase orders (BC) — supervisor only
        // ------------------------------------------------------------------

        [HttpGet("commandes")]
        [Authorize(Roles = Roles.Superviseur)]
        public async Task<ActionResult<object>> GetCommandes(string? statut = null, int? fournisseurId = null, string? search = null)
        {
            var today = DateTime.Today;
            var query = _context.BonsCommande.AsNoTracking().AsQueryable();
            if (!string.IsNullOrWhiteSpace(statut)) query = query.Where(b => b.Statut == statut);
            if (fournisseurId.HasValue) query = query.Where(b => b.IdFournisseur == fournisseurId);
            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim();
                query = query.Where(b => b.Numero.Contains(s) || b.Fournisseur.Nom.Contains(s) || b.Lignes.Any(l => l.Designation.Contains(s)));
            }

            return Ok(await query.OrderByDescending(b => b.DateCommande).ThenByDescending(b => b.Id).Take(300).Select(b => new
            {
                b.Id, b.Numero, b.Statut, b.DateCommande, b.DateLivraisonPrevue, b.DateReceptionComplete, b.Notes,
                b.IdFournisseur, Fournisseur = b.Fournisseur.Nom,
                DemandeAchat = b.DemandeAchat != null ? b.DemandeAchat.Numero : null,
                Montant = b.Lignes.Sum(l => (decimal?)(l.Quantite * l.PrixUnitaire)) ?? 0,
                MontantRecu = b.Lignes.Sum(l => (decimal?)(l.QuantiteRecue * l.PrixUnitaire)) ?? 0,
                NbLignes = b.Lignes.Count,
                EnRetard = b.DateLivraisonPrevue != null && b.DateLivraisonPrevue < today &&
                           (b.Statut == BonCommande.StatutEnvoye || b.Statut == BonCommande.StatutPartiel)
            }).ToListAsync());
        }

        [HttpGet("commandes/{id:int}")]
        [Authorize(Roles = Roles.Superviseur)]
        public async Task<ActionResult<object>> GetCommande(int id)
        {
            var bc = await _context.BonsCommande.AsNoTracking().Where(b => b.Id == id).Select(b => new
            {
                b.Id, b.Numero, b.Statut, b.DateCommande, b.DateLivraisonPrevue, b.DateReceptionComplete, b.Notes, b.DateCreation,
                b.IdFournisseur, b.IdDemandeAchat,
                Fournisseur = new { b.Fournisseur.Id, b.Fournisseur.Nom, b.Fournisseur.Contact, b.Fournisseur.Telephone, b.Fournisseur.Email, b.Fournisseur.Adresse },
                DemandeAchat = b.DemandeAchat != null ? b.DemandeAchat.Numero : null,
                Lignes = b.Lignes.OrderBy(l => l.Id).Select(l => new
                {
                    l.Id, l.IdPiece, l.Designation, l.Quantite, l.QuantiteRecue, l.PrixUnitaire, Montant = l.Quantite * l.PrixUnitaire,
                    Code = l.Piece != null ? l.Piece.CodePiece : null, Unite = l.Piece != null ? l.Piece.Unite : null
                }).ToList(),
                Receptions = _context.MouvementsStock.Where(m => m.IdBonCommande == b.Id)
                    .OrderByDescending(m => m.Date)
                    .Select(m => new { m.Date, m.Quantite, m.Piece.CodePiece, m.Piece.Designation, Utilisateur = m.Utilisateur != null ? m.Utilisateur.Prenom + " " + m.Utilisateur.Nom : null })
                    .ToList()
            }).FirstOrDefaultAsync();
            if (bc == null) return NotFound(new { message = "Bon de commande introuvable." });
            return Ok(new { bc, montant = bc.Lignes.Sum(l => l.Montant) });
        }

        public class CommandeDto
        {
            public int IdFournisseur { get; set; }
            public int? IdDemandeAchat { get; set; }
            public DateTime? DateLivraisonPrevue { get; set; }
            public string? Notes { get; set; }
            public bool Envoyer { get; set; }
            public List<LigneDto> Lignes { get; set; } = new();
        }

        [HttpPost("commandes")]
        [Authorize(Roles = Roles.Superviseur)]
        public async Task<ActionResult<object>> CreateCommande([FromBody] CommandeDto dto)
        {
            var user = await _currentUser.GetAsync();
            var fournisseur = await _context.Fournisseurs.AsNoTracking().FirstOrDefaultAsync(f => f.Id == dto.IdFournisseur && f.IsActif);
            if (fournisseur == null) return BadRequest(new { message = "Choisissez un fournisseur actif." });
            if (dto.Notes?.Length > 1000) return BadRequest(new { message = "Les notes ne doivent pas dépasser 1000 caractères." });
            if (dto.DateLivraisonPrevue.HasValue && dto.DateLivraisonPrevue.Value.Date < DateTime.Today)
                return BadRequest(new { message = "La date de livraison prévue ne peut pas être passée." });

            DemandeAchat? da = null;
            if (dto.IdDemandeAchat.HasValue)
            {
                da = await _context.DemandesAchat.FirstOrDefaultAsync(d => d.Id == dto.IdDemandeAchat);
                if (da == null || da.Statut != DemandeAchat.StatutApprouvee) return BadRequest(new { message = "La demande d'achat doit être approuvée." });
            }

            var (lignes, error) = await ValidateLinesAsync(dto.Lignes, prixObligatoire: true);
            if (error != null) return BadRequest(new { message = error });

            var bc = new BonCommande
            {
                Numero = await NextNumeroAsync("BC", _context.BonsCommande.Select(b => b.Numero)),
                IdFournisseur = fournisseur.Id,
                IdDemandeAchat = da?.Id,
                DateCommande = DateTime.Today,
                DateLivraisonPrevue = dto.DateLivraisonPrevue?.Date ??
                                      (fournisseur.DelaiLivraisonJours.HasValue ? DateTime.Today.AddDays(fournisseur.DelaiLivraisonJours.Value) : null),
                Statut = dto.Envoyer ? BonCommande.StatutEnvoye : BonCommande.StatutBrouillon,
                Notes = string.IsNullOrWhiteSpace(dto.Notes) ? null : dto.Notes.Trim(),
                IdCreateur = user?.Id,
                DateCreation = DateTime.Now,
                Lignes = lignes!.Select(l => new BonCommandeLigne { IdPiece = l.idPiece, Designation = l.designation, Quantite = l.quantite, PrixUnitaire = l.prix ?? 0 }).ToList()
            };
            _context.BonsCommande.Add(bc);
            if (da != null) da.Statut = DemandeAchat.StatutCommandee;
            await _context.SaveChangesAsync();
            _journal.Add(user, "BonCommande", bc.Id, "Création", $"{bc.Numero} — {fournisseur.Nom}");
            await _context.SaveChangesAsync();
            return Ok(new { bc.Id, bc.Numero });
        }

        [HttpPut("commandes/{id:int}")]
        [Authorize(Roles = Roles.Superviseur)]
        public async Task<ActionResult> UpdateCommande(int id, [FromBody] CommandeDto dto)
        {
            var user = await _currentUser.GetAsync();
            var bc = await _context.BonsCommande.Include(b => b.Lignes).FirstOrDefaultAsync(b => b.Id == id);
            if (bc == null) return NotFound(new { message = "Bon de commande introuvable." });
            if (bc.Statut != BonCommande.StatutBrouillon) return BadRequest(new { message = "Seul un brouillon peut être modifié." });
            if (!await _context.Fournisseurs.AnyAsync(f => f.Id == dto.IdFournisseur && f.IsActif)) return BadRequest(new { message = "Choisissez un fournisseur actif." });
            var (lignes, error) = await ValidateLinesAsync(dto.Lignes, prixObligatoire: true);
            if (error != null) return BadRequest(new { message = error });

            bc.IdFournisseur = dto.IdFournisseur;
            bc.DateLivraisonPrevue = dto.DateLivraisonPrevue?.Date;
            bc.Notes = string.IsNullOrWhiteSpace(dto.Notes) ? null : dto.Notes.Trim();
            _context.BonCommandeLignes.RemoveRange(bc.Lignes);
            bc.Lignes = lignes!.Select(l => new BonCommandeLigne { IdPiece = l.idPiece, Designation = l.designation, Quantite = l.quantite, PrixUnitaire = l.prix ?? 0 }).ToList();
            if (dto.Envoyer) bc.Statut = BonCommande.StatutEnvoye;
            _journal.Add(user, "BonCommande", id, "Modification", bc.Numero);
            await _context.SaveChangesAsync();
            return Ok();
        }

        [HttpPost("commandes/{id:int}/envoyer")]
        [Authorize(Roles = Roles.Superviseur)]
        public async Task<ActionResult> Send(int id)
        {
            var user = await _currentUser.GetAsync();
            var bc = await _context.BonsCommande.FirstOrDefaultAsync(b => b.Id == id);
            if (bc == null) return NotFound(new { message = "Bon de commande introuvable." });
            if (bc.Statut != BonCommande.StatutBrouillon) return BadRequest(new { message = "Ce bon de commande a déjà été envoyé." });
            bc.Statut = BonCommande.StatutEnvoye;
            bc.DateCommande = DateTime.Today;
            _journal.Add(user, "BonCommande", id, "Envoi au fournisseur", bc.Numero);
            await _context.SaveChangesAsync();
            return Ok();
        }

        [HttpPost("commandes/{id:int}/annuler")]
        [Authorize(Roles = Roles.Superviseur)]
        public async Task<ActionResult> Cancel(int id, [FromBody] DecisionDto dto)
        {
            var user = await _currentUser.GetAsync();
            var bc = await _context.BonsCommande.Include(b => b.Lignes).FirstOrDefaultAsync(b => b.Id == id);
            if (bc == null) return NotFound(new { message = "Bon de commande introuvable." });
            if (bc.Statut is BonCommande.StatutRecu or BonCommande.StatutAnnule) return BadRequest(new { message = "Ce bon de commande ne peut plus être annulé." });
            if (bc.Lignes.Any(l => l.QuantiteRecue > 0)) return BadRequest(new { message = "Une réception a déjà été enregistrée : clôturez plutôt la commande." });
            if (string.IsNullOrWhiteSpace(dto.Commentaire)) return BadRequest(new { message = "Indiquez le motif de l'annulation." });
            bc.Statut = BonCommande.StatutAnnule;
            bc.Notes = $"{bc.Notes}\nAnnulé : {dto.Commentaire.Trim()}".Trim();
            if (bc.Notes.Length > 1000) bc.Notes = bc.Notes[..1000];
            _journal.Add(user, "BonCommande", id, "Annulation", dto.Commentaire);
            await _context.SaveChangesAsync();
            return Ok();
        }

        public class ReceptionLigneDto
        {
            public int IdLigne { get; set; }
            public int Quantite { get; set; }
        }

        public class ReceptionDto
        {
            public List<ReceptionLigneDto> Lignes { get; set; } = new();
            public string? BonLivraison { get; set; }
        }

        /// <summary>Records a (partial) delivery: catalogue lines enter the store at the order price.</summary>
        [HttpPost("commandes/{id:int}/reception")]
        [Authorize(Roles = Roles.Superviseur)]
        public async Task<ActionResult> Receive(int id, [FromBody] ReceptionDto dto)
        {
            var user = await _currentUser.GetAsync();
            var bc = await _context.BonsCommande.Include(b => b.Lignes).FirstOrDefaultAsync(b => b.Id == id);
            if (bc == null) return NotFound(new { message = "Bon de commande introuvable." });
            if (bc.Statut is not (BonCommande.StatutEnvoye or BonCommande.StatutPartiel))
                return BadRequest(new { message = "Seul un bon de commande envoyé peut être réceptionné." });
            var saisies = dto.Lignes.Where(l => l.Quantite > 0).ToList();
            if (saisies.Count == 0) return BadRequest(new { message = "Indiquez au moins une quantité reçue." });
            if (dto.BonLivraison?.Length > 50) return BadRequest(new { message = "Numéro de bon de livraison trop long." });

            await using var tx = await _context.Database.BeginTransactionAsync();
            foreach (var saisie in saisies)
            {
                var ligne = bc.Lignes.FirstOrDefault(l => l.Id == saisie.IdLigne);
                if (ligne == null) return BadRequest(new { message = "Ligne de commande invalide." });
                var reste = ligne.Quantite - ligne.QuantiteRecue;
                if (saisie.Quantite > reste) return BadRequest(new { message = $"« {ligne.Designation} » : {reste} restant(s) à recevoir." });

                ligne.QuantiteRecue += saisie.Quantite;
                if (ligne.IdPiece.HasValue)
                {
                    var motif = string.IsNullOrWhiteSpace(dto.BonLivraison) ? $"Réception {bc.Numero}" : $"Réception {bc.Numero} — BL {dto.BonLivraison.Trim()}";
                    var (_, error) = await _stock.ApplyAsync(new StockRequest(ligne.IdPiece.Value, saisie.Quantite, MouvementStock.TypeEntree,
                        motif, ligne.PrixUnitaire, user?.Id, IdBonCommande: bc.Id));
                    if (error != null) return BadRequest(new { message = error });
                    if (ligne.PrixUnitaire > 0)
                        await _context.Pieces.Where(p => p.IDPiece == ligne.IdPiece)
                            .ExecuteUpdateAsync(s => s.SetProperty(p => p.PrixUnitaire, ligne.PrixUnitaire));
                }
            }

            var complete = bc.Lignes.All(l => l.QuantiteRecue >= l.Quantite);
            bc.Statut = complete ? BonCommande.StatutRecu : BonCommande.StatutPartiel;
            if (complete) bc.DateReceptionComplete = DateTime.Now;
            _journal.Add(user, "BonCommande", id, complete ? "Réception complète" : "Réception partielle", dto.BonLivraison);
            await _context.SaveChangesAsync();
            await tx.CommitAsync();
            return Ok(new { bc.Statut });
        }

        [HttpGet("synthese")]
        [Authorize(Roles = Roles.Superviseur)]
        public async Task<ActionResult<object>> GetSynthese()
        {
            var today = DateTime.Today;
            var debutAnnee = new DateTime(today.Year, 1, 1);
            var actifs = _context.BonsCommande.AsNoTracking().Where(b => b.Statut != BonCommande.StatutAnnule && b.Statut != BonCommande.StatutBrouillon);

            var engageAnnee = await actifs.Where(b => b.DateCommande >= debutAnnee)
                .SelectMany(b => b.Lignes).SumAsync(l => (decimal?)(l.Quantite * l.PrixUnitaire)) ?? 0;
            var enAttente = await actifs.Where(b => b.Statut == BonCommande.StatutEnvoye || b.Statut == BonCommande.StatutPartiel)
                .SelectMany(b => b.Lignes).SumAsync(l => (decimal?)((l.Quantite - l.QuantiteRecue) * l.PrixUnitaire)) ?? 0;
            var enRetard = await actifs.CountAsync(b => (b.Statut == BonCommande.StatutEnvoye || b.Statut == BonCommande.StatutPartiel) &&
                                                        b.DateLivraisonPrevue != null && b.DateLivraisonPrevue < today);
            var daEnAttente = await _context.DemandesAchat.CountAsync(d => d.Statut == DemandeAchat.StatutSoumise);
            var daApprouvees = await _context.DemandesAchat.CountAsync(d => d.Statut == DemandeAchat.StatutApprouvee);
            var brouillons = await _context.BonsCommande.CountAsync(b => b.Statut == BonCommande.StatutBrouillon);

            var parMoisRaw = await actifs.Where(b => b.DateCommande >= debutAnnee)
                .SelectMany(b => b.Lignes.Select(l => new { b.DateCommande.Month, Montant = l.Quantite * l.PrixUnitaire }))
                .GroupBy(x => x.Month)
                .Select(g => new { Mois = g.Key, Montant = g.Sum(x => x.Montant) })
                .ToListAsync();
            var parMois = Enumerable.Range(1, 12).Select(m => new { mois = m, montant = parMoisRaw.FirstOrDefault(x => x.Mois == m)?.Montant ?? 0 });

            return Ok(new { engageAnnee, enAttente, enRetard, daEnAttente, daApprouvees, brouillons, parMois });
        }
    }
}
