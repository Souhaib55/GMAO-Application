using API.DTOs;
using Core.Entities;
using Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PieceController : ControllerBase
    {
        private readonly StoreContext _context;

        public PieceController(StoreContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<PagedResult<object>>> GetPieces(int page = 1, int pageSize = 5)
        {
            var query = _context.Pieces
                .Where(p => p.IsActif)
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
                    p.PrixUnitaire,
                    p.DateCreation,
                    p.DateModification,
                    p.IsActif
                })
                .ToListAsync();

            return Ok(new PageResult<object>
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

            if (await _context.Pieces.AnyAsync(p => p.CodePiece == pieceDto.CodePiece && p.IsActif))
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
                PrixUnitaire = pieceDto.PrixUnitaire,
                DateCreation = pieceDto.DateCreation,
                DateModification = pieceDto.DateModification,
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

            if (existingPiece.CodePiece != pieceDto.CodePiece &&
                await _context.Pieces.AnyAsync(p => p.CodePiece == pieceDto.CodePiece && p.IsActif))
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
            existingPiece.PrixUnitaire = pieceDto.PrixUnitaire;
            existingPiece.DateModification = pieceDto.DateModification ?? DateTime.Now; // Use client-provided or fallback to now

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
    }

    public class PageResult<T>
    {
        public required List<T> Data { get; set; }
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
    }
}