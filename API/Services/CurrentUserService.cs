using Core.Entities;
using Infrastructure.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace API.Services
{
    public static class Roles
    {
        public const string Superviseur = "Superviseur";
        public const string Demandeur = "Demandeur";
        public const string Technicien = "Utilisateur";
    }

    /// <summary>The signed-in user's business record (Users table) and Identity role.</summary>
    public sealed record CurrentUser(Users Entity, string Role)
    {
        public int Id => Entity.ID;
        public string NomComplet => $"{Entity.Prenom} {Entity.Nom}".Trim();
        public bool IsSuperviseur => Role == Roles.Superviseur;
        public bool IsTechnicien => Role == Roles.Technicien;
        public bool IsDemandeur => Role == Roles.Demandeur;
    }

    public interface ICurrentUserService
    {
        /// <summary>Null when the session no longer maps to an active user.</summary>
        Task<CurrentUser?> GetAsync();
    }

    public class CurrentUserService : ICurrentUserService
    {
        private readonly IHttpContextAccessor _http;
        private readonly UserManager<AppUser> _userManager;
        private readonly StoreContext _context;
        private CurrentUser? _cached;
        private bool _resolved;

        public CurrentUserService(IHttpContextAccessor http, UserManager<AppUser> userManager, StoreContext context)
        {
            _http = http;
            _userManager = userManager;
            _context = context;
        }

        public async Task<CurrentUser?> GetAsync()
        {
            if (_resolved) return _cached;
            _resolved = true;

            var principal = _http.HttpContext?.User;
            if (principal?.Identity?.IsAuthenticated != true) return null;

            var appUser = await _userManager.GetUserAsync(principal);
            if (appUser == null) return null;

            var role = (await _userManager.GetRolesAsync(appUser)).FirstOrDefault();
            var entity = await _context.Users.FirstOrDefaultAsync(u => u.AppUserId == appUser.Id && u.IsActif);
            if (role == null || entity == null) return null;

            _cached = new CurrentUser(entity, role);
            return _cached;
        }
    }
}
