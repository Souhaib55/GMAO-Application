using Microsoft.AspNetCore.Authorization;
using Core.Entities;
using Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace API.Controllers
{
    [Authorize(Roles = "Superviseur")]
    [ApiController]
    [Route("api/[controller]")]
    public class UsersController : ControllerBase
    {
        private readonly StoreContext _context;
        private readonly UserManager<AppUser> _userManager;

        public UsersController(StoreContext context, UserManager<AppUser> userManager)
        {
            _context = context;
            _userManager = userManager;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<object>>> GetUsers()
        {
            var users = await _context.Users
                .Where(u => u.IsActif)
                .Include(u => u.Role)
                .Select(u => new {
                    u.ID,
                    u.AppUserId,
                    u.Nom,
                    u.Prenom,
                    u.Email,
                    u.DateCreation,
                    u.DateModification,
                    u.IsActif,
                    u.IDRole,
                    Role = u.Role != null ? new { u.Role.IDRole, u.Role.Libelle } : null
                })
                .ToListAsync();
                
            return Ok(users);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<object>> GetUser(int id)
        {
            var user = await _context.Users
                .Where(u => u.ID == id && u.IsActif)
                .Include(u => u.Role)
                .Select(u => new {
                    u.ID,
                    u.AppUserId,
                    u.Nom,
                    u.Prenom,
                    u.Email,
                    u.DateCreation,
                    u.DateModification,
                    u.IsActif,
                    u.IDRole,
                    Role = u.Role != null ? new { u.Role.IDRole, u.Role.Libelle } : null
                })
                .FirstOrDefaultAsync();
                
            if (user == null) return NotFound("User not found or inactive.");
            return Ok(user);
        }

        [HttpPost]
        public async Task<ActionResult<object>> CreateUser([FromBody] Users user)
        {
            if (user == null) return BadRequest("Les données utilisateur ne peuvent pas être nulles");
            
            // Vérifier si un utilisateur avec le même email existe déjà
            if (!string.IsNullOrEmpty(user.Email) && 
                await _context.Users.AnyAsync(u => u.Email == user.Email && u.IsActif))
            {
                return BadRequest("Un utilisateur avec cet email existe déjà.");
            }
            
            // Vérifier si le rôle existe
            if (user.IDRole > 0)
            {
                bool roleExists = await _context.Roles.AnyAsync(r => r.IDRole == user.IDRole);
                if (!roleExists)
                {
                    return BadRequest("Le rôle spécifié n'existe pas.");
                }
            }

            user.IsActif = true;
            user.DateCreation = DateTime.Now;
            user.DateModification = DateTime.Now;
            
            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            // Recharger l'utilisateur avec la relation Role
            var createdUser = await _context.Users
                .Where(u => u.ID == user.ID)
                .Include(u => u.Role)
                .Select(u => new {
                    u.ID,
                    u.AppUserId,
                    u.Nom,
                    u.Prenom,
                    u.Email,
                    u.DateCreation,
                    u.DateModification,
                    u.IsActif,
                    u.IDRole,
                    Role = u.Role != null ? new { u.Role.IDRole, u.Role.Libelle } : null
                })
                .FirstOrDefaultAsync();

            return CreatedAtAction(nameof(GetUser), new { id = user.ID }, createdUser);
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<object>> UpdateUser(int id, [FromBody] API.DTOs.UpdateUserDto userDto)
        {
            if (userDto == null) return BadRequest("Les données utilisateur ne peuvent pas être nulles");
            if (id != userDto.Id) return BadRequest("L'ID ne correspond pas");
            
            var existingUser = await _context.Users
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.ID == id && u.IsActif);
                
            if (existingUser == null) return NotFound("Utilisateur introuvable ou inactif.");

            // A supervisor cannot change their own role: it could remove the last administrator
            var currentAppUserId = _userManager.GetUserId(User);
            if (existingUser.AppUserId == currentAppUserId && existingUser.IDRole != userDto.IdRole)
                return BadRequest("Vous ne pouvez pas modifier votre propre rôle.");
            
            // Vérifier si la mise à jour créerait un doublon d'email
            if (!string.IsNullOrEmpty(userDto.Email) && existingUser.Email != userDto.Email && 
                await _context.Users.AnyAsync(u => u.Email == userDto.Email && u.IsActif))
            {
                return BadRequest("Un utilisateur avec cet email existe déjà.");
            }
            
            // Vérifier si le rôle existe
            if (userDto.IdRole > 0)
            {
                bool roleExists = await _context.Roles.AnyAsync(r => r.IDRole == userDto.IdRole);
                if (!roleExists)
                {
                    return BadRequest("Le rôle spécifié n'existe pas.");
                }
            }
            
            // Update AppUser (Identity) table to keep in sync
            var appUserId = existingUser.AppUserId;
            if (!string.IsNullOrEmpty(appUserId))
            {
                var appUser = await _userManager.FindByIdAsync(appUserId);
                if (appUser != null)
                {
                    // Update name and email in Identity table
                    appUser.FirstName = userDto.Prenom;
                    appUser.LastName = userDto.Nom;
                    appUser.Email = userDto.Email;
                    appUser.UserName = userDto.Email;
                    await _userManager.UpdateAsync(appUser);

                    // Check if role is being changed
                    if (existingUser.IDRole != userDto.IdRole)
                    {
                        var currentRoles = await _userManager.GetRolesAsync(appUser);
                        if (currentRoles.Any())
                        {
                            await _userManager.RemoveFromRolesAsync(appUser, currentRoles);
                        }
                        string newRoleName = GetRoleNameFromId(userDto.IdRole);
                        await _userManager.AddToRoleAsync(appUser, newRoleName);
                        // Existing sessions pick up the new role on their next validation
                        await _userManager.UpdateSecurityStampAsync(appUser);
                    }
                }
            }
            
            // Mettre à jour les propriétés dans la table Users
            existingUser.Nom = userDto.Nom;
            existingUser.Prenom = userDto.Prenom;
            existingUser.Email = userDto.Email;
            existingUser.IDRole = userDto.IdRole;
            existingUser.DateModification = DateTime.Now;
            
            await _context.SaveChangesAsync();
            
            // Recharger l'utilisateur avec la relation Role
            var updatedUser = await _context.Users
                .Where(u => u.ID == id)
                .Include(u => u.Role)
                .Select(u => new {
                    u.ID,
                    u.AppUserId,
                    u.Nom,
                    u.Prenom,
                    u.Email,
                    u.DateCreation,
                    u.DateModification,
                    u.IsActif,
                    u.IDRole,
                    Role = u.Role != null ? new { u.Role.IDRole, u.Role.Libelle } : null
                })
                .FirstOrDefaultAsync();
            
            return Ok(updatedUser);
        }
        
        private string GetRoleNameFromId(int roleId)
        {
            return roleId switch
            {
                1 => "Superviseur",
                2 => "Demandeur",
                3 => "Utilisateur",
                _ => "Utilisateur"
            };
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteUser(int id)
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.ID == id && u.IsActif);
                
            if (user == null) return NotFound("Utilisateur introuvable ou déjà inactif.");

            if (user.AppUserId == _userManager.GetUserId(User))
                return BadRequest("Vous ne pouvez pas désactiver votre propre compte.");

            // Suppression logique
            user.IsActif = false;
            user.DateModification = DateTime.Now;

            // Open work orders and preventive plans of a departing technician must not stay
            // assigned to an account nobody can use: they go back to "à affecter".
            var ouverts = await _context.DemandeInterventions
                .Where(d => d.IsActif && d.DestinatairesID == user.ID && (d.StatusId == 1 || d.StatusId == 2))
                .ToListAsync();
            foreach (var d in ouverts)
            {
                d.DestinatairesID = null;
                d.DateAssignation = null;
                d.DatePriseEnCharge = null;
                d.StatusId = 1;
            }
            var plans = await _context.PlansPreventifs.Where(p => p.IdTechnicien == user.ID).ToListAsync();
            plans.ForEach(p => p.IdTechnicien = null);
            if (ouverts.Count > 0 || plans.Count > 0)
            {
                _context.JournalActivites.Add(new JournalActivite
                {
                    Date = DateTime.Now, Entite = "Utilisateur", EntiteId = user.ID, Action = "Désactivation",
                    UtilisateurNom = User.Identity?.Name,
                    Details = $"{user.Prenom} {user.Nom} : {ouverts.Count} intervention(s) et {plans.Count} plan(s) préventif(s) remis à affecter"
                });
            }
            await _context.SaveChangesAsync();

            // Block the login as well and end any open session
            if (!string.IsNullOrEmpty(user.AppUserId))
            {
                var appUser = await _userManager.FindByIdAsync(user.AppUserId);
                if (appUser != null)
                {
                    await _userManager.SetLockoutEnabledAsync(appUser, true);
                    await _userManager.SetLockoutEndDateAsync(appUser, DateTimeOffset.MaxValue);
                    await _userManager.UpdateSecurityStampAsync(appUser);
                }
            }
            
            return NoContent();
        }

        [HttpGet("technicians")]
        public async Task<ActionResult<IEnumerable<object>>> GetTechnicians()
        {
            var technicians = await _context.Users
                .Where(u => u.IsActif && u.Role.Libelle == "Utilisateur")
                .Include(u => u.Role)
                .Select(u => new {
                    id = u.ID,
                    visageId = u.AppUserId,
                    firstName = u.Prenom,
                    lastName = u.Nom,
                    email = u.Email,
                    roles = new[] { u.Role.Libelle }
                })
                .ToListAsync();
                
            return Ok(technicians);
        }

        [HttpGet("roles")]
        public async Task<ActionResult<IEnumerable<object>>> GetRoles()
        {
            var roles = await _context.Roles
                .Select(r => new {
                    idRole = r.IDRole,
                    libelle = r.Libelle
                })
                .ToListAsync();
            return Ok(roles);
        }
    }
}