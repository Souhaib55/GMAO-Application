using Core.Entities;
using Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UsersController : ControllerBase
    {
        private readonly StoreContext _context;

        public UsersController(StoreContext context)
        {
            _context = context;
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
        public async Task<ActionResult<object>> UpdateUser(int id, [FromBody] Users user)
        {
            if (user == null) return BadRequest("Les données utilisateur ne peuvent pas être nulles");
            if (id != user.ID) return BadRequest("L'ID ne correspond pas");
            
            var existingUser = await _context.Users
                .FirstOrDefaultAsync(u => u.ID == id && u.IsActif);
                
            if (existingUser == null) return NotFound("Utilisateur introuvable ou inactif.");
            
            // Vérifier si la mise à jour créerait un doublon d'email
            if (!string.IsNullOrEmpty(user.Email) && existingUser.Email != user.Email && 
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
            
            // Mettre à jour les propriétés
            existingUser.Nom = user.Nom;
            existingUser.Prenom = user.Prenom;
            existingUser.Email = user.Email;
            existingUser.IDRole = user.IDRole;
            existingUser.AppUserId = user.AppUserId;
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

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteUser(int id)
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.ID == id && u.IsActif);
                
            if (user == null) return NotFound("Utilisateur introuvable ou déjà inactif.");
            
            // Suppression logique
            user.IsActif = false;
            user.DateModification = DateTime.Now;
            await _context.SaveChangesAsync();
            
            return NoContent();
        }
    }
}