using API.Security;
using API.DTOs;
using Core.Entities;
using Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace API.Controllers
{
    [SupervisorWrites]
    [ApiController]
    [Route("api/[controller]")]
    public class PieceController : ControllerBase
    {
        private readonly StoreContext _context;
        private readonly ILogger<PieceController> _logger;

        public PieceController(StoreContext context, ILogger<PieceController> logger)
        {
            _context = context;
            _logger = logger;
        }

        [HttpGet]
        public async Task<ActionResult<PagedResult<object>>> GetPieces(int page = 1, int pageSize = 5, string search = null)
        {
            var query = _context.Pieces
                .Where(p => p.IsActif);

            // Apply search filter if provided
            if (!string.IsNullOrWhiteSpace(search))
            {
                search = search.ToLower().Trim();
                query = query.Where(p => p.CodePiece.ToLower().Contains(search));
                // Typed text goes to the log as a value, on one line (no forged log entries)
                _logger.LogInformation("Applying search filter: {Search}", search.Replace('\r', ' ').Replace('\n', ' '));
            }

            query = query
                .Include(p => p.FamillePiece)
                .Include(p => p.Constructeur)
                .Include(p => p.CriticitePiece);

            var totalCount = await query.CountAsync();
            var items = await query
                .OrderBy(p => p.IDPiece)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(p => new
                {
                    p.IDPiece,
                    p.CodePiece,
                    p.Designation,
                    p.Description,
                    p.IDFamillePiece,
                    FamillePiece = p.FamillePiece != null ? new { p.FamillePiece.IDFamillePiece, p.FamillePiece.NomFamille } : null,
                    p.IDConstructeur,
                    Constructeur = p.Constructeur != null ? new { p.Constructeur.IDConstructeur, p.Constructeur.NomConstructeur } : null,
                    p.IDCriticitePiece,
                    CriticitePiece = p.CriticitePiece != null ? new { p.CriticitePiece.IDCriticitePiece, p.CriticitePiece.NiveauCriticitePiece } : null,
                    p.Quantite_Stock,
                    p.SeuilMinimum,
                    EnAlerte = p.Quantite_Stock <= p.SeuilMinimum,
                    p.PrixUnitaire,
                    p.DateCreation,
                    p.DateModification,
                    p.IsActif
                })
                .ToListAsync();

            _logger.LogInformation($"Retrieved {items.Count} pieces out of {totalCount} total (page {page}, pageSize {pageSize})");

            return Ok(new PagedResult<object>
            {
                Data = items.Cast<object>().ToList(),
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize
            });
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Piece>> GetPiece(int id)
        {
            var piece = await _context.Pieces
                .Include(p => p.FamillePiece)
                .Include(p => p.Constructeur)
                .Include(p => p.CriticitePiece)
                .FirstOrDefaultAsync(p => p.IDPiece == id && p.IsActif);

            if (piece == null)
            {
                return NotFound("Piece not found or inactive.");
            }

            return Ok(piece);
        }

        [HttpPost]
        public async Task<ActionResult<Piece>> CreatePiece([FromBody] RessourceDto pieceDto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var ruleError = ValidateBusinessRules(pieceDto);
            if (ruleError != null) return BadRequest(ruleError);

            // The unique index covers inactive rows too
            if (await _context.Pieces.AnyAsync(p => p.CodePiece == pieceDto.CodePiece))
            {
                return BadRequest("A piece with this CodePiece already exists.");
            }

            if (!await _context.FamillePieces.AnyAsync(f => f.IDFamillePiece == pieceDto.IDFamillePiece && f.IsActif))
                return BadRequest("Invalid or inactive FamillePiece ID.");
            if (!await _context.Constructeurs.AnyAsync(c => c.IDConstructeur == pieceDto.IDConstructeur && c.IsActif))
                return BadRequest("Invalid or inactive Constructeur ID.");
            if (!await _context.CriticitePieces.AnyAsync(c => c.IDCriticitePiece == pieceDto.IDCriticitePiece && c.IsActif))
                return BadRequest("Invalid or inactive CriticitePiece ID.");

            var piece = new Piece
            {
                CodePiece = pieceDto.CodePiece,
                Designation = pieceDto.Designation,
                Description = pieceDto.Description,
                IDFamillePiece = pieceDto.IDFamillePiece,
                IDConstructeur = pieceDto.IDConstructeur,
                IDCriticitePiece = pieceDto.IDCriticitePiece,
                Quantite_Stock = pieceDto.Quantite_Stock,
                SeuilMinimum = pieceDto.SeuilMinimum,
                PrixUnitaire = pieceDto.PrixUnitaire,
                DateCreation = DateTime.Now,
                IsActif = true
            };

            _context.Pieces.Add(piece);
            await _context.SaveChangesAsync();

            piece = await _context.Pieces
                .Include(p => p.FamillePiece)
                .Include(p => p.Constructeur)
                .Include(p => p.CriticitePiece)
                .FirstOrDefaultAsync(p => p.IDPiece == piece.IDPiece);

            return CreatedAtAction(nameof(GetPiece), new { id = piece.IDPiece }, piece);
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<Piece>> UpdatePiece(int id, [FromBody] RessourceDto pieceDto)
        {
            if (id != pieceDto.IDPiece)
            {
                return BadRequest("ID mismatch.");
            }

            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var existingPiece = await _context.Pieces
                .FirstOrDefaultAsync(p => p.IDPiece == id && p.IsActif);

            if (existingPiece == null)
            {
                return NotFound("Piece not found or inactive.");
            }

            var ruleError = ValidateBusinessRules(pieceDto);
            if (ruleError != null) return BadRequest(ruleError);

            if (existingPiece.CodePiece != pieceDto.CodePiece &&
                await _context.Pieces.AnyAsync(p => p.CodePiece == pieceDto.CodePiece && p.IDPiece != id))
            {
                return BadRequest("A piece with this CodePiece already exists.");
            }

            if (!await _context.FamillePieces.AnyAsync(f => f.IDFamillePiece == pieceDto.IDFamillePiece && f.IsActif))
                return BadRequest("Invalid or inactive FamillePiece ID.");
            if (!await _context.Constructeurs.AnyAsync(c => c.IDConstructeur == pieceDto.IDConstructeur && c.IsActif))
                return BadRequest("Invalid or inactive Constructeur ID.");
            if (!await _context.CriticitePieces.AnyAsync(c => c.IDCriticitePiece == pieceDto.IDCriticitePiece && c.IsActif))
                return BadRequest("Invalid or inactive CriticitePiece ID.");

            existingPiece.CodePiece = pieceDto.CodePiece;
            existingPiece.Designation = pieceDto.Designation;
            existingPiece.Description = pieceDto.Description;
            existingPiece.IDFamillePiece = pieceDto.IDFamillePiece;
            existingPiece.IDConstructeur = pieceDto.IDConstructeur;
            existingPiece.IDCriticitePiece = pieceDto.IDCriticitePiece;
            existingPiece.Quantite_Stock = pieceDto.Quantite_Stock;
            existingPiece.SeuilMinimum = pieceDto.SeuilMinimum;
            existingPiece.PrixUnitaire = pieceDto.PrixUnitaire;
            existingPiece.DateModification = DateTime.Now;

            await _context.SaveChangesAsync();

            var updatedPiece = await _context.Pieces
                .Include(p => p.FamillePiece)
                .Include(p => p.Constructeur)
                .Include(p => p.CriticitePiece)
                .FirstOrDefaultAsync(p => p.IDPiece == id);

            return Ok(updatedPiece);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeletePiece(int id)
        {
            var piece = await _context.Pieces
                .FirstOrDefaultAsync(p => p.IDPiece == id && p.IsActif);

            if (piece == null)
            {
                return NotFound("Piece not found or already inactive.");
            }

            piece.IsActif = false;
            piece.DateModification = DateTime.Now;
            await _context.SaveChangesAsync();

            return NoContent();
        }

        /// <summary>Stock quantities, prices and reorder points are never negative.</summary>
        private static string? ValidateBusinessRules(RessourceDto dto)
        {
            dto.CodePiece = dto.CodePiece?.Trim() ?? string.Empty;
            dto.Designation = dto.Designation?.Trim() ?? string.Empty;
            if (dto.CodePiece.Length is 0 or > 50) return "La référence de la pièce est obligatoire (50 caractères maximum).";
            if (dto.Designation.Length is 0 or > 100) return "La désignation est obligatoire (100 caractères maximum).";
            if (dto.Quantite_Stock < 0) return "La quantité en stock ne peut pas être négative.";
            if (dto.SeuilMinimum < 0) return "Le seuil de réapprovisionnement ne peut pas être négatif.";
            if (dto.PrixUnitaire < 0) return "Le prix unitaire ne peut pas être négatif.";
            return null;
        }
    }

    public class PagedResult<T>
    {
        public List<T> Data { get; set; } // Removed the 'required' keyword
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
    }
}