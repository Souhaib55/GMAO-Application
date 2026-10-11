using API.Services;
using Core.Entities;
using Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace API.Controllers
{
    /// <summary>
    /// Annual maintenance budgets and actual spend. Actual cost comes from the work
    /// orders: labour (time × hourly rate), parts consumed and external services.
    /// </summary>
    [Authorize(Roles = Roles.Superviseur)]
    [ApiController]
    [Route("api/budgets")]
    public class BudgetsController : ControllerBase
    {
        public static readonly string[] Categories = { Budget.CategorieMainOeuvre, Budget.CategoriePieces, Budget.CategorieSousTraitance };

        private readonly StoreContext _context;
        private readonly ICurrentUserService _currentUser;
        private readonly IJournalService _journal;

        public BudgetsController(StoreContext context, ICurrentUserService currentUser, IJournalService journal)
        {
            _context = context;
            _currentUser = currentUser;
            _journal = journal;
        }

        private sealed record Depense(int Mois, string Categorie, int? Chaine, decimal Montant);

        /// <summary>Actual maintenance spend of a year, by month, category and production line.</summary>
        private async Task<List<Depense>> GetDepensesAsync(int annee)
        {
            var debut = new DateTime(annee, 1, 1);
            var fin = debut.AddYears(1);

            var mo = await _context.InterventionTemps.AsNoTracking()
                .Where(t => t.Debut >= debut && t.Debut < fin && t.DemandeIntervention.IsActif)
                .Select(t => new { t.Debut.Month, Chaine = (int?)t.DemandeIntervention.IDChaineProduction, Montant = t.DureeMinutes * (t.TauxHoraire ?? t.Technicien.TauxHoraire ?? 0) / 60m })
                .ToListAsync();
            var pieces = await _context.InterventionPieces.AsNoTracking()
                .Where(p => p.Date >= debut && p.Date < fin && p.DemandeIntervention.IsActif)
                .Select(p => new { p.Date.Month, Chaine = (int?)p.DemandeIntervention.IDChaineProduction, Montant = p.Quantite * p.PrixUnitaire })
                .ToListAsync();
            var externes = await _context.DemandeInterventions.AsNoTracking()
                .Where(d => d.IsActif && d.CoutExterne > 0 && (d.DateRealisation ?? d.DateCreation) >= debut && (d.DateRealisation ?? d.DateCreation) < fin)
                .Select(d => new { (d.DateRealisation ?? d.DateCreation).Month, Chaine = (int?)d.IDChaineProduction, Montant = d.CoutExterne!.Value })
                .ToListAsync();

            return mo.Select(x => new Depense(x.Month, Budget.CategorieMainOeuvre, x.Chaine, x.Montant))
                .Concat(pieces.Select(x => new Depense(x.Month, Budget.CategoriePieces, x.Chaine, x.Montant)))
                .Concat(externes.Select(x => new Depense(x.Month, Budget.CategorieSousTraitance, x.Chaine, x.Montant)))
                .ToList();
        }

        [HttpGet]
        public async Task<ActionResult<object>> Get(int? annee = null)
        {
            var year = annee ?? DateTime.Today.Year;
            if (year < 2000 || year > 2100) return BadRequest(new { message = "Année invalide." });

            var budgets = await _context.Budgets.AsNoTracking()
                .Where(b => b.Annee == year)
                .Select(b => new { b.Id, b.Annee, b.Categorie, b.IdChaineProduction, Chaine = b.ChaineProduction != null ? b.ChaineProduction.Libelle : null, b.Montant, b.Notes })
                .ToListAsync();
            var depenses = await GetDepensesAsync(year);

            // Months elapsed, to compare the spend with the pro-rata budget
            var moisEcoules = year < DateTime.Today.Year ? 12 : year > DateTime.Today.Year ? 0 : DateTime.Today.Month;

            var lignes = budgets
                .OrderBy(b => Array.IndexOf(Categories, b.Categorie)).ThenBy(b => b.Chaine)
                .Select(b =>
                {
                    var realise = depenses.Where(d => d.Categorie == b.Categorie && (b.IdChaineProduction == null || d.Chaine == b.IdChaineProduction)).Sum(d => d.Montant);
                    var prorata = b.Montant * moisEcoules / 12m;
                    return new
                    {
                        b.Id, b.Annee, b.Categorie, b.IdChaineProduction, b.Chaine, b.Montant, b.Notes,
                        Realise = Math.Round(realise, 3),
                        Taux = b.Montant > 0 ? Math.Round(100 * realise / b.Montant, 1) : (decimal?)null,
                        Prorata = Math.Round(prorata, 3),
                        Ecart = Math.Round(prorata - realise, 3)
                    };
                }).ToList();

            var parMois = Enumerable.Range(1, 12).Select(m => new
            {
                mois = m,
                mainOeuvre = Math.Round(depenses.Where(d => d.Mois == m && d.Categorie == Budget.CategorieMainOeuvre).Sum(d => d.Montant), 3),
                pieces = Math.Round(depenses.Where(d => d.Mois == m && d.Categorie == Budget.CategoriePieces).Sum(d => d.Montant), 3),
                sousTraitance = Math.Round(depenses.Where(d => d.Mois == m && d.Categorie == Budget.CategorieSousTraitance).Sum(d => d.Montant), 3)
            }).ToList();

            // Totals use line-less budgets only (a per-line budget is a subdivision of the global one when both exist)
            var budgetTotal = budgets.Where(b => b.IdChaineProduction == null).Sum(b => b.Montant);
            if (budgetTotal == 0) budgetTotal = budgets.Sum(b => b.Montant);
            var realiseTotal = depenses.Sum(d => d.Montant);

            var parChaine = depenses.GroupBy(d => d.Chaine).Select(g => new { chaineId = g.Key, montant = Math.Round(g.Sum(d => d.Montant), 3) }).ToList();
            var chaines = await _context.ChaineProductions.AsNoTracking().Select(c => new { c.IDChaineProduction, c.Libelle }).ToListAsync();

            return Ok(new
            {
                annee = year,
                categories = Categories,
                lignes,
                parMois,
                parChaine = parChaine.Select(p => new { p.chaineId, chaine = chaines.FirstOrDefault(c => c.IDChaineProduction == p.chaineId)?.Libelle ?? "Non affectée", p.montant }).OrderByDescending(p => p.montant),
                budgetTotal,
                realiseTotal = Math.Round(realiseTotal, 3),
                tauxConsommation = budgetTotal > 0 ? Math.Round(100 * realiseTotal / budgetTotal, 1) : (decimal?)null,
                moisEcoules
            });
        }

        public class BudgetDto
        {
            public int Annee { get; set; }
            public string? Categorie { get; set; }
            public int? IdChaineProduction { get; set; }
            public decimal Montant { get; set; }
            public string? Notes { get; set; }
        }

        [HttpPost]
        public Task<ActionResult> Create([FromBody] BudgetDto dto) => SaveAsync(null, dto);

        [HttpPut("{id:int}")]
        public Task<ActionResult> Update(int id, [FromBody] BudgetDto dto) => SaveAsync(id, dto);

        private async Task<ActionResult> SaveAsync(int? id, BudgetDto dto)
        {
            var user = await _currentUser.GetAsync();
            if (dto.Annee < 2000 || dto.Annee > 2100) return BadRequest(new { message = "Année invalide." });
            if (!Categories.Contains(dto.Categorie)) return BadRequest(new { message = "Catégorie invalide." });
            if (dto.Montant < 0 || dto.Montant > 1_000_000_000) return BadRequest(new { message = "Montant invalide." });
            if (dto.Notes?.Length > 500) return BadRequest(new { message = "500 caractères maximum." });
            if (dto.IdChaineProduction.HasValue && !await _context.ChaineProductions.AnyAsync(c => c.IDChaineProduction == dto.IdChaineProduction))
                return BadRequest(new { message = "Chaîne invalide." });
            if (await _context.Budgets.AnyAsync(b => b.Annee == dto.Annee && b.Categorie == dto.Categorie && b.IdChaineProduction == dto.IdChaineProduction && b.Id != (id ?? 0)))
                return BadRequest(new { message = "Un budget existe déjà pour cette année, cette catégorie et ce périmètre." });

            Budget? b;
            if (id.HasValue)
            {
                b = await _context.Budgets.FirstOrDefaultAsync(x => x.Id == id);
                if (b == null) return NotFound(new { message = "Budget introuvable." });
            }
            else
            {
                b = new Budget();
                _context.Budgets.Add(b);
            }
            b.Annee = dto.Annee;
            b.Categorie = dto.Categorie!;
            b.IdChaineProduction = dto.IdChaineProduction;
            b.Montant = dto.Montant;
            b.Notes = string.IsNullOrWhiteSpace(dto.Notes) ? null : dto.Notes.Trim();
            await _context.SaveChangesAsync();
            _journal.Add(user, "Budget", b.Id, id.HasValue ? "Modification" : "Création", $"{b.Annee} {b.Categorie} : {b.Montant:N3} DT");
            await _context.SaveChangesAsync();
            return Ok(new { b.Id });
        }

        [HttpDelete("{id:int}")]
        public async Task<ActionResult> Delete(int id)
        {
            var user = await _currentUser.GetAsync();
            var b = await _context.Budgets.FirstOrDefaultAsync(x => x.Id == id);
            if (b == null) return NotFound(new { message = "Budget introuvable." });
            _context.Budgets.Remove(b);
            _journal.Add(user, "Budget", id, "Suppression", $"{b.Annee} {b.Categorie}");
            await _context.SaveChangesAsync();
            return Ok();
        }
    }
}
