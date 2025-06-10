using Core.Entities;
using Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ModeleEquipementController : ControllerBase
    {
        private readonly StoreContext _context;

        public ModeleEquipementController(StoreContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<ModeleEquipement>>> GetModeleEquipements()
        {
            return Ok(await _context.ModeleEquipements
                .Include(m => m.Marque)
                .Include(m => m.Famille)
                .Include(m => m.Criticite)
                .Where(m => m.IsActif && m.Marque.IsActif && m.Famille.IsActif && m.Criticite.IsActif)
                .ToListAsync());
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<ModeleEquipement>> GetModeleEquipement(int id)
        {
            var modele = await _context.ModeleEquipements
                .Include(m => m.Marque)
                .Include(m => m.Famille)
                .Include(m => m.Criticite)
                .Where(m => m.IdModele == id && m.IsActif && m.Marque.IsActif && m.Famille.IsActif && m.Criticite.IsActif)
                .FirstOrDefaultAsync();
            if (modele == null) return NotFound("Modele not found or inactive.");
            return Ok(modele);
        }

        [HttpPost]
        public async Task<ActionResult<ModeleEquipement>> CreateModeleEquipement([FromBody] ModeleEquipement modele)
        {
            if (modele == null) return BadRequest("Les données du modèle ne peuvent pas être nulles");
            
            if (await _context.ModeleEquipements.AnyAsync(m => m.NomModele == modele.NomModele && m.IsActif))
            {
                return BadRequest("Un modèle d'équipement avec ce nom existe déjà.");
            }

            // Vérifier que les entités liées existent et sont actives
            bool marqueExists = await _context.Marques.AnyAsync(m => m.IdMarque == modele.IdMarque && m.IsActif);
            bool familleExists = await _context.FamilleEquipements.AnyAsync(f => f.IdFamille == modele.IdFamille && f.IsActif);
            bool criticiteExists = await _context.EquipmentCriticites.AnyAsync(c => c.IdCriticite == modele.IdCriticite && c.IsActif);

            if (!marqueExists) return BadRequest("La marque spécifiée n'existe pas ou est inactive.");
            if (!familleExists) return BadRequest("La famille spécifiée n'existe pas ou est inactive.");
            if (!criticiteExists) return BadRequest("La criticité spécifiée n'existe pas ou est inactive.");

            modele.IsActif = true;
            modele.DateCreation = DateTime.Now;
            modele.DateModification = null;
            
            _context.ModeleEquipements.Add(modele);
            await _context.SaveChangesAsync();

            // Charger les entités associées pour la réponse
            await _context.Entry(modele).Reference(m => m.Marque).LoadAsync();
            await _context.Entry(modele).Reference(m => m.Famille).LoadAsync();
            await _context.Entry(modele).Reference(m => m.Criticite).LoadAsync();

            return CreatedAtAction(nameof(GetModeleEquipement), new { id = modele.IdModele }, modele);
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<ModeleEquipement>> UpdateModeleEquipement(int id, [FromBody] ModeleEquipement modele)
        {
            if (modele == null) return BadRequest("Les données du modèle ne peuvent pas être nulles");
            if (id != modele.IdModele) return BadRequest("L'ID ne correspond pas");
            
            var existingModele = await _context.ModeleEquipements
                .FirstOrDefaultAsync(m => m.IdModele == id && m.IsActif);
                
            if (existingModele == null) return NotFound("Modèle d'équipement introuvable ou inactif.");
            
            // Vérifier si le nom existe déjà pour un autre modèle
            if (existingModele.NomModele != modele.NomModele && 
                await _context.ModeleEquipements.AnyAsync(m => m.NomModele == modele.NomModele && m.IdModele != id && m.IsActif))
            {
                return BadRequest("Un modèle d'équipement avec ce nom existe déjà.");
            }

            // Vérifier que les entités liées existent et sont actives
            bool marqueExists = await _context.Marques.AnyAsync(m => m.IdMarque == modele.IdMarque && m.IsActif);
            bool familleExists = await _context.FamilleEquipements.AnyAsync(f => f.IdFamille == modele.IdFamille && f.IsActif);
            bool criticiteExists = await _context.EquipmentCriticites.AnyAsync(c => c.IdCriticite == modele.IdCriticite && c.IsActif);

            if (!marqueExists) return BadRequest("La marque spécifiée n'existe pas ou est inactive.");
            if (!familleExists) return BadRequest("La famille spécifiée n'existe pas ou est inactive.");
            if (!criticiteExists) return BadRequest("La criticité spécifiée n'existe pas ou est inactive.");
            
            existingModele.NomModele = modele.NomModele;
            existingModele.IdMarque = modele.IdMarque;
            existingModele.IdFamille = modele.IdFamille;
            existingModele.IdCriticite = modele.IdCriticite;
            existingModele.Commentaire = modele.Commentaire;
            existingModele.DateModification = DateTime.Now;
            
            await _context.SaveChangesAsync();

            // Charger les entités associées pour la réponse
            await _context.Entry(existingModele).Reference(m => m.Marque).LoadAsync();
            await _context.Entry(existingModele).Reference(m => m.Famille).LoadAsync();
            await _context.Entry(existingModele).Reference(m => m.Criticite).LoadAsync();
            
            return Ok(existingModele);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteModeleEquipement(int id)
        {
            var modele = await _context.ModeleEquipements
                .FirstOrDefaultAsync(m => m.IdModele == id && m.IsActif);
                
            if (modele == null) return NotFound("Modèle d'équipement introuvable ou déjà inactif.");
            
            // Vérifier si le modèle est utilisé par des équipements actifs
            // Remarque: Equipment utilise IsDeleted au lieu de IsActif
            bool hasActiveEquipments = await _context.Equipments.AnyAsync(e => e.IdModele == id && !e.IsDeleted);
            if (hasActiveEquipments)
            {
                return BadRequest("Ce modèle ne peut pas être supprimé car il est associé à des équipements actifs.");
            }
            
            modele.IsActif = false;
            modele.DateModification = DateTime.Now;
            await _context.SaveChangesAsync();
            
            return NoContent();
        }
    }
}