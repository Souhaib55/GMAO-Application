// 7. Create a StatusController
using API.DTOs;
using Core.Entities;
using Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace API.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class StatusController : ControllerBase
    {
        private readonly StoreContext _context;

        public StatusController(StoreContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<StatusDto>>> GetAllStatus()
        {
            var statuses = await _context.Statuses
                .Where(s => s.IsActif)
                .Select(s => new StatusDto
                {
                    Id = s.Id,
                    Statut = s.Statut,
                    Description = s.Description,
                    IsActif = s.IsActif
                })
                .ToListAsync();

            return Ok(statuses);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<StatusDto>> GetStatus(int id)
        {
            var status = await _context.Statuses.FindAsync(id);

            if (status == null || !status.IsActif)
            {
                return NotFound();
            }

            var statusDto = new StatusDto
            {
                Id = status.Id,
                Statut = status.Statut,
                Description = status.Description,
                IsActif = status.IsActif
            };

            return Ok(statusDto);
        }
    }
}