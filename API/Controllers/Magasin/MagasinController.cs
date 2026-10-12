using API.Security;
using API.Services;
using Core.Entities;
using Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace API.Controllers
{
    /// <summary>
    /// Unified store: one article master (spare parts, consumables, tools), quantities
    /// changed only through stock movements, store rooms and reorder suggestions.
    /// Technicians may read (to pick parts for a job); writes are reserved to supervisors.
    /// </summary>
    [Authorize(Roles = Roles.Superviseur + "," + Roles.Technicien)]
    [SupervisorWrites]
    [ApiController]
    [Route("api/magasin")]
    public class MagasinController : ControllerBase
    {
        public static readonly string[] TypesArticle = { "Pièce de rechange", "Consommable", "Outillage" };

        private readonly StoreContext _context;
        private readonly ICurrentUserService _currentUser;
        private readonly IStockService _stock;
        private readonly IJournalService _journal;

        public MagasinController(StoreContext context, ICurrentUserService currentUser, IStockService stock, IJournalService journal)
        {
            _context = context;
            _currentUser = currentUser;
            _stock = stock;
            _journal = journal;
        }

        // An article without a reorder point is not stock-managed: an empty shelf is not an alert
        public static string NiveauStock(int quantite, int seuil) =>
            seuil <= 0 ? (quantite > 0 ? "Disponible" : "Non suivi")
            : quantite <= 0 ? "Rupture" : quantite <= seuil ? "Sous le seuil" : "Disponible";

        // ------------------------------------------------------------------
        // Articles
        // ------------------------------------------------------------------

        [HttpGet("articles")]
        public async Task<ActionResult<object>> GetArticles(
            string? search = null, string? type = null, int? magasinId = null, int? familleId = null,
            string? niveau = null, bool inclureInactifs = false, int page = 1, int pageSize = 25)
        {
            page = Math.Max(1, page);
            pageSize = Math.Clamp(pageSize, 5, 200);

            var query = _context.Pieces.AsNoTracking().AsQueryable();
            if (!inclureInactifs) query = query.Where(p => p.IsActif);
            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim();
                query = query.Where(p => p.CodePiece.Contains(s) || p.Designation.Contains(s) ||
                                         (p.ReferenceFournisseur != null && p.ReferenceFournisseur.Contains(s)) ||
                                         (p.Emplacement != null && p.Emplacement.Contains(s)));
            }
            if (!string.IsNullOrWhiteSpace(type)) query = query.Where(p => p.TypeArticle == type);
            if (magasinId.HasValue) query = query.Where(p => p.IdMagasin == magasinId);
            if (familleId.HasValue) query = query.Where(p => p.IDFamillePiece == familleId);
            query = niveau switch
            {
                "rupture" => query.Where(p => p.SeuilMinimum > 0 && p.Quantite_Stock <= 0),
                "alerte" => query.Where(p => p.SeuilMinimum > 0 && p.Quantite_Stock <= p.SeuilMinimum),
                "disponible" => query.Where(p => p.Quantite_Stock > p.SeuilMinimum),
                _ => query
            };

            var total = await query.CountAsync();
            var rows = await query
                .OrderBy(p => p.SeuilMinimum > 0 && p.Quantite_Stock <= p.SeuilMinimum ? 0 : 1).ThenBy(p => p.Designation)
                .Skip((page - 1) * pageSize).Take(pageSize)
                .Select(p => new
                {
                    p.IDPiece, p.CodePiece, p.Designation, p.TypeArticle, p.Unite,
                    p.Quantite_Stock, p.SeuilMinimum, p.StockMaximum, p.PrixUnitaire,
                    Valeur = p.Quantite_Stock * p.PrixUnitaire,
                    p.Emplacement, p.IsActif,
                    Famille = p.FamillePiece.NomFamille,
                    Magasin = p.Magasin != null ? p.Magasin.Nom : null,
                    Fournisseur = p.Fournisseur != null ? p.Fournisseur.Nom : null,
                    Criticite = p.CriticitePiece.NiveauCriticitePiece
                })
                .ToListAsync();

            return Ok(new
            {
                data = rows.Select(r => new
                {
                    r.IDPiece, r.CodePiece, r.Designation, r.TypeArticle, r.Unite, r.Quantite_Stock, r.SeuilMinimum,
                    r.StockMaximum, r.PrixUnitaire, r.Valeur, r.Emplacement, r.IsActif, r.Famille, r.Magasin,
                    r.Fournisseur, r.Criticite, Niveau = NiveauStock(r.Quantite_Stock, r.SeuilMinimum)
                }),
                totalCount = total,
                page,
                pageSize
            });
        }

        [HttpGet("articles/{id:int}")]
        public async Task<ActionResult<object>> GetArticle(int id)
        {
            var article = await _context.Pieces.AsNoTracking()
                .Where(p => p.IDPiece == id)
                .Select(p => new
                {
                    p.IDPiece, p.CodePiece, p.Designation, p.Description, p.TypeArticle, p.Unite,
                    p.IDFamillePiece, p.IDConstructeur, p.IDCriticitePiece, p.IdMagasin, p.IdFournisseur,
                    p.Quantite_Stock, p.SeuilMinimum, p.StockMaximum, p.PrixUnitaire, p.Emplacement,
                    p.ReferenceFournisseur, p.DelaiApproJours, p.IsActif, p.DateCreation, p.DateModification,
                    Famille = p.FamillePiece.NomFamille,
                    Constructeur = p.Constructeur != null ? p.Constructeur.NomConstructeur : null,
                    Criticite = p.CriticitePiece.NiveauCriticitePiece,
                    Magasin = p.Magasin != null ? p.Magasin.Nom : null,
                    Fournisseur = p.Fournisseur != null ? p.Fournisseur.Nom : null
                })
                .FirstOrDefaultAsync();
            if (article == null) return NotFound(new { message = "Article introuvable." });

            var depuis = DateTime.Today.AddMonths(-11);
            var debutMois = new DateTime(depuis.Year, depuis.Month, 1);
            var sorties = await _context.MouvementsStock.AsNoTracking()
                .Where(m => m.IdPiece == id && m.Quantite < 0 && m.Date >= debutMois)
                .GroupBy(m => new { m.Date.Year, m.Date.Month })
                .Select(g => new { g.Key.Year, g.Key.Month, Quantite = -g.Sum(m => m.Quantite) })
                .ToListAsync();
            var consommation = Enumerable.Range(0, 12).Select(i => debutMois.AddMonths(i)).Select(m => new
            {
                Mois = m.ToString("yyyy-MM"),
                Quantite = sorties.FirstOrDefault(s => s.Year == m.Year && s.Month == m.Month)?.Quantite ?? 0
            }).ToList();

            var mouvements = await _context.MouvementsStock.AsNoTracking()
                .Where(m => m.IdPiece == id)
                .OrderByDescending(m => m.Date).ThenByDescending(m => m.Id)
                .Take(50)
                .Select(m => new
                {
                    m.Id, m.Date, m.Type, m.Quantite, m.StockApres, m.PrixUnitaire, m.Motif,
                    m.IdDemandeIntervention, m.IdBonCommande,
                    BonCommande = m.BonCommande != null ? m.BonCommande.Numero : null,
                    Utilisateur = m.Utilisateur != null ? m.Utilisateur.Prenom + " " + m.Utilisateur.Nom : null
                })
                .ToListAsync();

            var moyenneMensuelle = consommation.Average(c => c.Quantite);
            return Ok(new
            {
                article,
                niveau = NiveauStock(article.Quantite_Stock, article.SeuilMinimum),
                valeur = article.Quantite_Stock * article.PrixUnitaire,
                consommation,
                consommationMoyenneMensuelle = Math.Round(moyenneMensuelle, 1),
                couvertureMois = moyenneMensuelle > 0 ? Math.Round(article.Quantite_Stock / moyenneMensuelle, 1) : (double?)null,
                mouvements
            });
        }

        public class ArticleDto
        {
            public string? CodePiece { get; set; }
            public string? Designation { get; set; }
            public string? Description { get; set; }
            public string? TypeArticle { get; set; }
            public string? Unite { get; set; }
            public int IDFamillePiece { get; set; }
            public int? IDConstructeur { get; set; }
            public int IDCriticitePiece { get; set; }
            public int? IdMagasin { get; set; }
            public int? IdFournisseur { get; set; }
            public int SeuilMinimum { get; set; }
            public int? StockMaximum { get; set; }
            public decimal PrixUnitaire { get; set; }
            public string? Emplacement { get; set; }
            public string? ReferenceFournisseur { get; set; }
            public int? DelaiApproJours { get; set; }
            public bool IsActif { get; set; } = true;
            // Only on creation: opening quantity, recorded as an "Inventaire initial" movement
            public int QuantiteInitiale { get; set; }
        }

        private async Task<string?> ApplyAsync(Piece piece, ArticleDto dto, int? excludeId)
        {
            var code = dto.CodePiece?.Trim();
            var designation = dto.Designation?.Trim();
            if (string.IsNullOrWhiteSpace(code)) return "Le code article est obligatoire.";
            if (code.Length > 50) return "Le code article ne doit pas dépasser 50 caractères.";
            if (string.IsNullOrWhiteSpace(designation) || designation.Length < 2) return "La désignation est obligatoire.";
            if (designation.Length > 100) return "La désignation ne doit pas dépasser 100 caractères.";
            if (dto.Description?.Length > 255) return "La description ne doit pas dépasser 255 caractères.";
            if (!TypesArticle.Contains(dto.TypeArticle)) return "Type d'article invalide.";
            var unite = string.IsNullOrWhiteSpace(dto.Unite) ? "pièce" : dto.Unite.Trim();
            if (unite.Length > 20) return "Unité invalide.";
            if (dto.SeuilMinimum < 0) return "Le seuil minimum ne peut pas être négatif.";
            if (dto.StockMaximum.HasValue && dto.StockMaximum < dto.SeuilMinimum) return "Le stock maximum doit être supérieur au seuil minimum.";
            if (dto.PrixUnitaire < 0) return "Le prix unitaire ne peut pas être négatif.";
            if (dto.DelaiApproJours is < 0 or > 365) return "Délai d'approvisionnement invalide.";
            if (dto.Emplacement?.Length > 50) return "L'emplacement ne doit pas dépasser 50 caractères.";
            if (dto.ReferenceFournisseur?.Length > 50) return "La référence fournisseur ne doit pas dépasser 50 caractères.";

            if (await _context.Pieces.AnyAsync(p => p.CodePiece == code && p.IDPiece != (excludeId ?? 0)))
                return "Ce code article existe déjà.";
            if (!await _context.FamillePieces.AnyAsync(f => f.IDFamillePiece == dto.IDFamillePiece && f.IsActif)) return "Famille invalide.";
            if (!await _context.CriticitePieces.AnyAsync(c => c.IDCriticitePiece == dto.IDCriticitePiece && c.IsActif)) return "Criticité invalide.";
            if (dto.IDConstructeur.HasValue && !await _context.Constructeurs.AnyAsync(c => c.IDConstructeur == dto.IDConstructeur && c.IsActif)) return "Constructeur invalide.";
            if (dto.IdMagasin.HasValue && !await _context.Magasins.AnyAsync(m => m.Id == dto.IdMagasin && m.IsActif)) return "Magasin invalide.";
            if (dto.IdFournisseur.HasValue && !await _context.Fournisseurs.AnyAsync(f => f.Id == dto.IdFournisseur && f.IsActif)) return "Fournisseur invalide.";

            piece.CodePiece = code;
            piece.Designation = designation;
            piece.Description = string.IsNullOrWhiteSpace(dto.Description) ? null : dto.Description.Trim();
            piece.TypeArticle = dto.TypeArticle!;
            piece.Unite = unite;
            piece.IDFamillePiece = dto.IDFamillePiece;
            piece.IDConstructeur = dto.IDConstructeur;
            piece.IDCriticitePiece = dto.IDCriticitePiece;
            piece.IdMagasin = dto.IdMagasin;
            piece.IdFournisseur = dto.IdFournisseur;
            piece.SeuilMinimum = dto.SeuilMinimum;
            piece.StockMaximum = dto.StockMaximum;
            piece.PrixUnitaire = dto.PrixUnitaire;
            piece.Emplacement = string.IsNullOrWhiteSpace(dto.Emplacement) ? null : dto.Emplacement.Trim();
            piece.ReferenceFournisseur = string.IsNullOrWhiteSpace(dto.ReferenceFournisseur) ? null : dto.ReferenceFournisseur.Trim();
            piece.DelaiApproJours = dto.DelaiApproJours;
            piece.IsActif = dto.IsActif;
            return null;
        }

        [HttpPost("articles")]
        public async Task<ActionResult<object>> CreateArticle([FromBody] ArticleDto dto)
        {
            var user = await _currentUser.GetAsync();
            if (dto.QuantiteInitiale < 0) return BadRequest(new { message = "La quantité initiale ne peut pas être négative." });

            var piece = new Piece { DateCreation = DateTime.Now, Quantite_Stock = 0 };
            var error = await ApplyAsync(piece, dto, null);
            if (error != null) return BadRequest(new { message = error });

            await using var tx = await _context.Database.BeginTransactionAsync();
            _context.Pieces.Add(piece);
            await _context.SaveChangesAsync();
            if (dto.QuantiteInitiale > 0)
            {
                var (_, stockError) = await _stock.ApplyAsync(new StockRequest(piece.IDPiece, dto.QuantiteInitiale,
                    MouvementStock.TypeInventaireInitial, "Stock à la création de l'article", piece.PrixUnitaire, user?.Id));
                if (stockError != null) return BadRequest(new { message = stockError });
            }
            _journal.Add(user, "Article", piece.IDPiece, "Création", $"{piece.CodePiece} — {piece.Designation}");
            await _context.SaveChangesAsync();
            await tx.CommitAsync();
            return Ok(new { piece.IDPiece });
        }

        [HttpPut("articles/{id:int}")]
        public async Task<ActionResult> UpdateArticle(int id, [FromBody] ArticleDto dto)
        {
            var user = await _currentUser.GetAsync();
            var piece = await _context.Pieces.FirstOrDefaultAsync(p => p.IDPiece == id);
            if (piece == null) return NotFound(new { message = "Article introuvable." });

            // The quantity is never edited here: it only changes through movements
            var error = await ApplyAsync(piece, dto, id);
            if (error != null) return BadRequest(new { message = error });
            piece.DateModification = DateTime.Now;
            _journal.Add(user, "Article", id, "Modification", piece.CodePiece);
            await _context.SaveChangesAsync();
            return Ok();
        }

        // ------------------------------------------------------------------
        // Movements
        // ------------------------------------------------------------------

        public class MouvementDto
        {
            public int IdPiece { get; set; }
            // "Entrée", "Sortie" or "Ajustement"
            public string? Type { get; set; }
            // Entry/issue: quantity moved (> 0). Adjustment: quantity counted on the shelf (>= 0).
            public int Quantite { get; set; }
            public decimal? PrixUnitaire { get; set; }
            public string? Motif { get; set; }
            public int? IdDemandeIntervention { get; set; }
        }

        [HttpPost("mouvements")]
        public async Task<ActionResult<object>> CreateMouvement([FromBody] MouvementDto dto)
        {
            var user = await _currentUser.GetAsync();
            var piece = await _context.Pieces.AsNoTracking().FirstOrDefaultAsync(p => p.IDPiece == dto.IdPiece);
            if (piece == null) return NotFound(new { message = "Article introuvable." });
            if (dto.Motif?.Length > 255) return BadRequest(new { message = "Le motif ne doit pas dépasser 255 caractères." });
            if (dto.PrixUnitaire < 0) return BadRequest(new { message = "Le prix unitaire ne peut pas être négatif." });

            int delta;
            switch (dto.Type)
            {
                case MouvementStock.TypeEntree:
                    if (dto.Quantite <= 0) return BadRequest(new { message = "La quantité doit être positive." });
                    delta = dto.Quantite;
                    break;
                case MouvementStock.TypeSortie:
                    if (dto.Quantite <= 0) return BadRequest(new { message = "La quantité doit être positive." });
                    if (!dto.IdDemandeIntervention.HasValue && string.IsNullOrWhiteSpace(dto.Motif))
                        return BadRequest(new { message = "Indiquez le motif de la sortie (ou sortez la pièce depuis l'intervention concernée)." });
                    delta = -dto.Quantite;
                    break;
                case MouvementStock.TypeAjustement:
                    if (dto.Quantite < 0) return BadRequest(new { message = "La quantité comptée ne peut pas être négative." });
                    if (string.IsNullOrWhiteSpace(dto.Motif)) return BadRequest(new { message = "Indiquez le motif de l'ajustement (inventaire, casse, perte…)." });
                    delta = dto.Quantite - piece.Quantite_Stock;
                    if (delta == 0) return BadRequest(new { message = "La quantité comptée est égale au stock actuel." });
                    break;
                default:
                    return BadRequest(new { message = "Type de mouvement invalide." });
            }

            if (dto.IdDemandeIntervention.HasValue &&
                !await _context.DemandeInterventions.AnyAsync(d => d.IdDemandeIntervention == dto.IdDemandeIntervention && d.IsActif))
                return BadRequest(new { message = "Intervention invalide." });

            var (mouvement, error) = await _stock.ApplyAsync(new StockRequest(dto.IdPiece, delta, dto.Type!, dto.Motif,
                dto.Type == MouvementStock.TypeEntree ? dto.PrixUnitaire : null, user?.Id, dto.IdDemandeIntervention));
            if (error != null) return BadRequest(new { message = error });

            // A purchase entry at a new price updates the article's reference price
            if (dto.Type == MouvementStock.TypeEntree && dto.PrixUnitaire is > 0)
                await _context.Pieces.Where(p => p.IDPiece == dto.IdPiece)
                    .ExecuteUpdateAsync(s => s.SetProperty(p => p.PrixUnitaire, dto.PrixUnitaire.Value));

            _journal.Add(user, "Article", dto.IdPiece, $"Mouvement {dto.Type}", $"{delta:+0;-0} {piece.Unite} — stock {mouvement!.StockApres}");
            await _context.SaveChangesAsync();
            return Ok(new { mouvement.Id, mouvement.StockApres });
        }

        [HttpGet("mouvements")]
        public async Task<ActionResult<object>> GetMouvements(int? pieceId = null, string? type = null, DateTime? from = null, DateTime? to = null, string? search = null, int page = 1, int pageSize = 50)
        {
            page = Math.Max(1, page);
            pageSize = Math.Clamp(pageSize, 10, 200);
            var query = _context.MouvementsStock.AsNoTracking().AsQueryable();
            if (pieceId.HasValue) query = query.Where(m => m.IdPiece == pieceId);
            if (!string.IsNullOrWhiteSpace(type)) query = query.Where(m => m.Type == type);
            if (from.HasValue) query = query.Where(m => m.Date >= from.Value.Date);
            if (to.HasValue) query = query.Where(m => m.Date < to.Value.Date.AddDays(1));
            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim();
                query = query.Where(m => m.Piece.CodePiece.Contains(s) || m.Piece.Designation.Contains(s) || (m.Motif != null && m.Motif.Contains(s)));
            }

            var total = await query.CountAsync();
            var data = await query
                .OrderByDescending(m => m.Date).ThenByDescending(m => m.Id)
                .Skip((page - 1) * pageSize).Take(pageSize)
                .Select(m => new
                {
                    m.Id, m.Date, m.Type, m.Quantite, m.StockApres, m.PrixUnitaire, m.Motif,
                    m.IdPiece, Code = m.Piece.CodePiece, Designation = m.Piece.Designation, m.Piece.Unite,
                    m.IdDemandeIntervention, m.IdBonCommande,
                    BonCommande = m.BonCommande != null ? m.BonCommande.Numero : null,
                    Utilisateur = m.Utilisateur != null ? m.Utilisateur.Prenom + " " + m.Utilisateur.Nom : null
                })
                .ToListAsync();
            return Ok(new { data, totalCount = total, page, pageSize });
        }

        // ------------------------------------------------------------------
        // Overview and replenishment
        // ------------------------------------------------------------------

        [HttpGet("synthese")]
        public async Task<ActionResult<object>> GetSynthese()
        {
            var actifs = _context.Pieces.AsNoTracking().Where(p => p.IsActif);
            var depuis = DateTime.Today.AddDays(-30);

            var valeur = await actifs.SumAsync(p => (decimal?)(p.Quantite_Stock * p.PrixUnitaire)) ?? 0;
            var articles = await actifs.CountAsync();
            var ruptures = await actifs.CountAsync(p => p.SeuilMinimum > 0 && p.Quantite_Stock <= 0);
            var sousSeuil = await actifs.CountAsync(p => p.Quantite_Stock > 0 && p.Quantite_Stock <= p.SeuilMinimum);
            var mouvements30 = _context.MouvementsStock.AsNoTracking().Where(m => m.Date >= depuis);
            var entrees = await mouvements30.Where(m => m.Quantite > 0 && m.Type != MouvementStock.TypeInventaireInitial)
                .SumAsync(m => (decimal?)(m.Quantite * (m.PrixUnitaire ?? 0))) ?? 0;
            var sorties = await mouvements30.Where(m => m.Quantite < 0)
                .SumAsync(m => (decimal?)(-m.Quantite * (m.PrixUnitaire ?? 0))) ?? 0;

            var topConsommes = await mouvements30.Where(m => m.Quantite < 0)
                .GroupBy(m => new { m.IdPiece, m.Piece.CodePiece, m.Piece.Designation, m.Piece.Unite })
                .Select(g => new { g.Key.IdPiece, g.Key.CodePiece, g.Key.Designation, g.Key.Unite, Quantite = -g.Sum(m => m.Quantite), Valeur = g.Sum(m => -m.Quantite * (m.PrixUnitaire ?? 0)) })
                .OrderByDescending(x => x.Valeur)
                .Take(5)
                .ToListAsync();

            var parType = await actifs.GroupBy(p => p.TypeArticle)
                .Select(g => new { Type = g.Key, Articles = g.Count(), Valeur = g.Sum(p => p.Quantite_Stock * p.PrixUnitaire) })
                .ToListAsync();

            // Articles not moved for 12 months but still holding value
            var unAn = DateTime.Today.AddYears(-1);
            var dormants = await actifs
                .Where(p => p.Quantite_Stock > 0 && !_context.MouvementsStock.Any(m => m.IdPiece == p.IDPiece && m.Quantite < 0 && m.Date >= unAn))
                .SumAsync(p => (decimal?)(p.Quantite_Stock * p.PrixUnitaire)) ?? 0;

            return Ok(new { valeur, articles, ruptures, sousSeuil, entrees30 = entrees, sorties30 = sorties, valeurDormante = dormants, topConsommes, parType });
        }

        /// <summary>Articles at or under their reorder point, with a suggested order quantity.</summary>
        [HttpGet("reapprovisionnement")]
        public async Task<ActionResult<object>> GetReappro()
        {
            var rows = await _context.Pieces.AsNoTracking()
                .Where(p => p.IsActif && p.Quantite_Stock <= p.SeuilMinimum && (p.SeuilMinimum > 0 || p.StockMaximum > 0))
                .Select(p => new
                {
                    p.IDPiece, p.CodePiece, p.Designation, p.Unite, p.Quantite_Stock, p.SeuilMinimum, p.StockMaximum,
                    p.PrixUnitaire, p.IdFournisseur, Fournisseur = p.Fournisseur != null ? p.Fournisseur.Nom : null,
                    p.DelaiApproJours,
                    // Quantity already on order and not yet received
                    EnCommande = _context.BonCommandeLignes
                        .Where(l => l.IdPiece == p.IDPiece &&
                                    (l.BonCommande.Statut == BonCommande.StatutEnvoye || l.BonCommande.Statut == BonCommande.StatutPartiel || l.BonCommande.Statut == BonCommande.StatutBrouillon))
                        .Sum(l => (int?)(l.Quantite - l.QuantiteRecue)) ?? 0
                })
                .OrderBy(p => p.Quantite_Stock).ThenBy(p => p.Designation)
                .ToListAsync();

            return Ok(rows.Select(r =>
            {
                var cible = r.StockMaximum ?? Math.Max(r.SeuilMinimum * 2, 1);
                var suggestion = Math.Max(0, cible - r.Quantite_Stock - r.EnCommande);
                return new
                {
                    r.IDPiece, r.CodePiece, r.Designation, r.Unite, r.Quantite_Stock, r.SeuilMinimum, r.StockMaximum,
                    r.PrixUnitaire, r.IdFournisseur, r.Fournisseur, r.DelaiApproJours, r.EnCommande,
                    QuantiteSuggeree = suggestion,
                    MontantEstime = suggestion * r.PrixUnitaire
                };
            }));
        }

        // ------------------------------------------------------------------
        // Store rooms
        // ------------------------------------------------------------------

        [HttpGet("magasins")]
        public async Task<ActionResult<object>> GetMagasins() =>
            Ok(await _context.Magasins.AsNoTracking()
                .OrderBy(m => m.Nom)
                .Select(m => new
                {
                    m.Id, m.Code, m.Nom, m.Description, m.IsActif,
                    Articles = _context.Pieces.Count(p => p.IdMagasin == m.Id && p.IsActif),
                    Valeur = _context.Pieces.Where(p => p.IdMagasin == m.Id && p.IsActif).Sum(p => (decimal?)(p.Quantite_Stock * p.PrixUnitaire)) ?? 0
                })
                .ToListAsync());

        public class MagasinDto
        {
            public string? Code { get; set; }
            public string? Nom { get; set; }
            public string? Description { get; set; }
            public bool IsActif { get; set; } = true;
        }

        [HttpPost("magasins")]
        public async Task<ActionResult> CreateMagasin([FromBody] MagasinDto dto) => await SaveMagasinAsync(null, dto);

        [HttpPut("magasins/{id:int}")]
        public async Task<ActionResult> UpdateMagasin(int id, [FromBody] MagasinDto dto) => await SaveMagasinAsync(id, dto);

        private async Task<ActionResult> SaveMagasinAsync(int? id, MagasinDto dto)
        {
            var code = dto.Code?.Trim().ToUpperInvariant();
            var nom = dto.Nom?.Trim();
            if (string.IsNullOrWhiteSpace(code) || code.Length > 20) return BadRequest(new { message = "Code obligatoire (20 caractères maximum)." });
            if (string.IsNullOrWhiteSpace(nom) || nom.Length > 100) return BadRequest(new { message = "Nom obligatoire (100 caractères maximum)." });
            if (await _context.Magasins.AnyAsync(m => m.Code == code && m.Id != (id ?? 0))) return BadRequest(new { message = "Ce code existe déjà." });

            Magasin? magasin;
            if (id.HasValue)
            {
                magasin = await _context.Magasins.FirstOrDefaultAsync(m => m.Id == id);
                if (magasin == null) return NotFound(new { message = "Magasin introuvable." });
            }
            else
            {
                magasin = new Magasin { DateCreation = DateTime.Now };
                _context.Magasins.Add(magasin);
            }
            magasin.Code = code;
            magasin.Nom = nom;
            magasin.Description = string.IsNullOrWhiteSpace(dto.Description) ? null : dto.Description.Trim();
            magasin.IsActif = dto.IsActif;
            await _context.SaveChangesAsync();
            return Ok(new { magasin.Id });
        }

        [HttpGet("references")]
        public async Task<ActionResult<object>> GetReferences() => Ok(new
        {
            types = TypesArticle,
            familles = await _context.FamillePieces.AsNoTracking().Where(f => f.IsActif).OrderBy(f => f.NomFamille).Select(f => new { id = f.IDFamillePiece, libelle = f.NomFamille }).ToListAsync(),
            constructeurs = await _context.Constructeurs.AsNoTracking().Where(c => c.IsActif).OrderBy(c => c.NomConstructeur).Select(c => new { id = c.IDConstructeur, libelle = c.NomConstructeur }).ToListAsync(),
            criticites = await _context.CriticitePieces.AsNoTracking().Where(c => c.IsActif).OrderBy(c => c.IDCriticitePiece).Select(c => new { id = c.IDCriticitePiece, libelle = c.NiveauCriticitePiece }).ToListAsync(),
            magasins = await _context.Magasins.AsNoTracking().Where(m => m.IsActif).OrderBy(m => m.Nom).Select(m => new { id = m.Id, libelle = m.Nom }).ToListAsync(),
            fournisseurs = await _context.Fournisseurs.AsNoTracking().Where(f => f.IsActif).OrderBy(f => f.Nom).Select(f => new { id = f.Id, libelle = f.Nom }).ToListAsync()
        });
    }
}
