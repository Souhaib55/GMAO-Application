using System.Net.Mail;
using API.Security;
using API.Services;
using Core.Entities;
using Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace API.Controllers
{
    [Authorize(Roles = Roles.Superviseur + "," + Roles.Technicien)]
    [SupervisorWrites]
    [ApiController]
    [Route("api/fournisseurs")]
    public class FournisseursController : ControllerBase
    {
        private readonly StoreContext _context;
        private readonly ICurrentUserService _currentUser;
        private readonly IJournalService _journal;

        public FournisseursController(StoreContext context, ICurrentUserService currentUser, IJournalService journal)
        {
            _context = context;
            _currentUser = currentUser;
            _journal = journal;
        }

        [HttpGet]
        public async Task<ActionResult<object>> GetAll(string? search = null, bool inclureInactifs = false)
        {
            var query = _context.Fournisseurs.AsNoTracking().AsQueryable();
            if (!inclureInactifs) query = query.Where(f => f.IsActif);
            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim();
                query = query.Where(f => f.Nom.Contains(s) || f.Code.Contains(s) || (f.Contact != null && f.Contact.Contains(s)));
            }

            var unAn = DateTime.Today.AddYears(-1);
            return Ok(await query.OrderBy(f => f.Nom).Select(f => new
            {
                f.Id, f.Code, f.Nom, f.Contact, f.Telephone, f.Email, f.Adresse, f.DelaiLivraisonJours, f.Notes, f.IsActif,
                Articles = _context.Pieces.Count(p => p.IdFournisseur == f.Id && p.IsActif),
                CommandesEnCours = _context.BonsCommande.Count(b => b.IdFournisseur == f.Id &&
                    (b.Statut == BonCommande.StatutEnvoye || b.Statut == BonCommande.StatutPartiel)),
                Achats12Mois = _context.BonCommandeLignes
                    .Where(l => l.BonCommande.IdFournisseur == f.Id && l.BonCommande.DateCommande >= unAn && l.BonCommande.Statut != BonCommande.StatutAnnule)
                    .Sum(l => (decimal?)(l.Quantite * l.PrixUnitaire)) ?? 0,
                // Share of received orders delivered by the promised date
                LivraisonsALHeure = _context.BonsCommande.Count(b => b.IdFournisseur == f.Id && b.DateReceptionComplete != null &&
                    b.DateLivraisonPrevue != null && b.DateReceptionComplete <= b.DateLivraisonPrevue.Value.AddDays(1)),
                Livraisons = _context.BonsCommande.Count(b => b.IdFournisseur == f.Id && b.DateReceptionComplete != null && b.DateLivraisonPrevue != null)
            }).ToListAsync());
        }

        public class FournisseurDto
        {
            public string? Code { get; set; }
            public string? Nom { get; set; }
            public string? Contact { get; set; }
            public string? Telephone { get; set; }
            public string? Email { get; set; }
            public string? Adresse { get; set; }
            public int? DelaiLivraisonJours { get; set; }
            public string? Notes { get; set; }
            public bool IsActif { get; set; } = true;
        }

        [HttpPost]
        public Task<ActionResult> Create([FromBody] FournisseurDto dto) => SaveAsync(null, dto);

        [HttpPut("{id:int}")]
        public Task<ActionResult> Update(int id, [FromBody] FournisseurDto dto) => SaveAsync(id, dto);

        private static string? Clean(string? v) => string.IsNullOrWhiteSpace(v) ? null : v.Trim();

        private async Task<ActionResult> SaveAsync(int? id, FournisseurDto dto)
        {
            var user = await _currentUser.GetAsync();
            var nom = dto.Nom?.Trim();
            if (string.IsNullOrWhiteSpace(nom) || nom.Length < 2 || nom.Length > 150) return BadRequest(new { message = "Le nom est obligatoire (150 caractères maximum)." });
            var email = Clean(dto.Email);
            if (email != null && (email.Length > 150 || !MailAddress.TryCreate(email, out _))) return BadRequest(new { message = "Adresse e-mail invalide." });
            if (Clean(dto.Telephone)?.Length > 30) return BadRequest(new { message = "Téléphone invalide." });
            if (Clean(dto.Contact)?.Length > 100) return BadRequest(new { message = "Le contact ne doit pas dépasser 100 caractères." });
            if (Clean(dto.Adresse)?.Length > 255) return BadRequest(new { message = "L'adresse ne doit pas dépasser 255 caractères." });
            if (Clean(dto.Notes)?.Length > 1000) return BadRequest(new { message = "Les notes ne doivent pas dépasser 1000 caractères." });
            if (dto.DelaiLivraisonJours is < 0 or > 365) return BadRequest(new { message = "Délai de livraison invalide." });

            Fournisseur? f;
            if (id.HasValue)
            {
                f = await _context.Fournisseurs.FirstOrDefaultAsync(x => x.Id == id);
                if (f == null) return NotFound(new { message = "Fournisseur introuvable." });
            }
            else
            {
                f = new Fournisseur { DateCreation = DateTime.Now };
                var next = (await _context.Fournisseurs.MaxAsync(x => (int?)x.Id) ?? 0) + 1;
                f.Code = Clean(dto.Code)?.ToUpperInvariant() ?? $"FRN-{next:000}";
                _context.Fournisseurs.Add(f);
            }

            if (id.HasValue && Clean(dto.Code) != null) f.Code = dto.Code!.Trim().ToUpperInvariant();
            if (f.Code.Length > 20) return BadRequest(new { message = "Le code ne doit pas dépasser 20 caractères." });
            if (await _context.Fournisseurs.AnyAsync(x => x.Code == f.Code && x.Id != (id ?? 0))) return BadRequest(new { message = "Ce code fournisseur existe déjà." });

            f.Nom = nom;
            f.Contact = Clean(dto.Contact);
            f.Telephone = Clean(dto.Telephone);
            f.Email = email;
            f.Adresse = Clean(dto.Adresse);
            f.DelaiLivraisonJours = dto.DelaiLivraisonJours;
            f.Notes = Clean(dto.Notes);
            f.IsActif = dto.IsActif;
            await _context.SaveChangesAsync();
            _journal.Add(user, "Fournisseur", f.Id, id.HasValue ? "Modification" : "Création", f.Nom);
            await _context.SaveChangesAsync();
            return Ok(new { f.Id, f.Code });
        }
    }
}
