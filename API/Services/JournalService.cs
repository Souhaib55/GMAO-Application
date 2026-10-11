using Core.Entities;
using Infrastructure.Data;

namespace API.Services
{
    /// <summary>
    /// Writes the audit trail. Entries are added to the current unit of work, so they
    /// are saved together with the change they describe.
    /// </summary>
    public interface IJournalService
    {
        void Add(CurrentUser? user, string entite, int? entiteId, string action, string? details = null);
    }

    public class JournalService : IJournalService
    {
        private readonly StoreContext _context;

        public JournalService(StoreContext context) => _context = context;

        public void Add(CurrentUser? user, string entite, int? entiteId, string action, string? details = null)
        {
            _context.JournalActivites.Add(new JournalActivite
            {
                Date = DateTime.Now,
                UtilisateurId = user?.Id,
                UtilisateurNom = user?.NomComplet ?? "Système",
                Entite = entite,
                EntiteId = entiteId,
                Action = action,
                Details = details is { Length: > 1000 } ? details[..1000] : details
            });
        }
    }
}
