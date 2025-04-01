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
    public class EquipmentController : ControllerBase
    {
        private readonly StoreContext _context;

        public EquipmentController(StoreContext context)
        {
            _context = context;
        }
        

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Equipment>>> GetEquipments(int page = 1, int pageSize = 5)
        {
            var totalCount = await _context.Equipments.Where(e => !e.IsDeleted).CountAsync();
            var equipments = await _context.Equipments
                .Where(e => !e.IsDeleted) // Filter out deleted equipment
                .Include(e => e.FamilleEquipment)
                .Include(e => e.EquipmentCriticite)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return Ok(new
            {
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize,
                Data = equipments
            });
        }


        [HttpGet("{id}")]
        public async Task<ActionResult<Equipment>> GetEquipment(int id)
        {
            var equipment = await _context.Equipments
                .Where(e => !e.IsDeleted) // Filter out deleted equipment
                .Include(e => e.FamilleEquipment)
                .Include(e => e.EquipmentCriticite)
                .FirstOrDefaultAsync(e => e.Id == id);

            if (equipment == null)
                return NotFound();

            return Ok(equipment);
        }

        [HttpPost]
        public async Task<ActionResult<Equipment>> CreateEquipment([FromBody] Equipment equipment)
        {
            if (equipment == null) return BadRequest("Equipment cannot be null");
            if (string.IsNullOrWhiteSpace(equipment.Code)) return BadRequest("Code is required");
            if (string.IsNullOrWhiteSpace(equipment.Designation)) return BadRequest("Designation is required");

            var familleEquipment = await _context.FamilleEquipments.FirstOrDefaultAsync(f => f.Id == equipment.FamilleEquipmentId);
            if (familleEquipment == null) return BadRequest($"Invalid FamilleEquipmentId: {equipment.FamilleEquipmentId}");

            var equipmentCriticite = await _context.EquipmentCriticites.FirstOrDefaultAsync(ec => ec.Id == equipment.EquipmentCriticiteId);
            if (equipmentCriticite == null) return BadRequest($"Invalid EquipmentCriticiteId: {equipment.EquipmentCriticiteId}");

            equipment.CreatedOn = DateTime.Now; // Set CreatedOn for new entries

            try
            {
                _context.Equipments.Add(equipment);
                await _context.SaveChangesAsync();

                var savedEquipment = await _context.Equipments
                    .Include(e => e.FamilleEquipment)
                    .Include(e => e.EquipmentCriticite)
                    .FirstOrDefaultAsync(e => e.Id == equipment.Id);

                return CreatedAtAction(nameof(GetEquipment), new { id = equipment.Id }, savedEquipment);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateEquipment(int id, [FromBody] Equipment equipment)
        {
            if (equipment == null) return BadRequest("Equipment cannot be null");
            if (id != equipment.Id) return BadRequest("Equipment ID mismatch");
            if (string.IsNullOrWhiteSpace(equipment.Code)) return BadRequest("Code is required");
            if (string.IsNullOrWhiteSpace(equipment.Designation)) return BadRequest("Designation is required");

            var existingEquipment = await _context.Equipments.FirstOrDefaultAsync(e => e.Id == id);
            if (existingEquipment == null) return NotFound($"Equipment with ID {id} not found");

            var familleEquipment = await _context.FamilleEquipments.FirstOrDefaultAsync(f => f.Id == equipment.FamilleEquipmentId);
            if (familleEquipment == null) return BadRequest($"Invalid FamilleEquipmentId: {equipment.FamilleEquipmentId}");

            var equipmentCriticite = await _context.EquipmentCriticites.FirstOrDefaultAsync(ec => ec.Id == equipment.EquipmentCriticiteId);
            if (equipmentCriticite == null) return BadRequest($"Invalid EquipmentCriticiteId: {equipment.EquipmentCriticiteId}");

            try
            {
                existingEquipment.Code = equipment.Code;
                existingEquipment.Designation = equipment.Designation;
                existingEquipment.FamilleEquipmentId = equipment.FamilleEquipmentId;
                existingEquipment.EquipmentCriticiteId = equipment.EquipmentCriticiteId;
                existingEquipment.CreatedOn = equipment.CreatedOn != default ? equipment.CreatedOn : existingEquipment.CreatedOn; // Preserve or update

                await _context.SaveChangesAsync();
                return NoContent();
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteEquipment(int id)
        {
            var equipment = await _context.Equipments
                .FirstOrDefaultAsync(e => e.Id == id && !e.IsDeleted); // Check if it exists and isn't already deleted

            if (equipment == null)
                return NotFound($"Equipment with ID {id} not found or already deleted");

            try
            {
                equipment.IsDeleted = true; // Mark as deleted
                await _context.SaveChangesAsync();
                return NoContent();
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

    }
}