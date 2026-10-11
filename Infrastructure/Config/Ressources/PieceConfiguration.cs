using Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Config
{
    public class PieceConfiguration : IEntityTypeConfiguration<Piece>
    {
        public void Configure(EntityTypeBuilder<Piece> builder)
        {
            builder.HasKey(p => p.IDPiece);
            builder.Property(p => p.CodePiece).IsRequired().HasMaxLength(50);
            builder.HasIndex(p => p.CodePiece).IsUnique();
            builder.Property(p => p.Designation).IsRequired().HasMaxLength(100);
            builder.Property(p => p.Description).HasMaxLength(255);
            builder.Property(p => p.Quantite_Stock).IsRequired();
            builder.Property(p => p.SeuilMinimum).HasDefaultValue(0);
            builder.Property(p => p.PrixUnitaire).HasPrecision(10, 2);
            builder.Property(p => p.DateCreation).HasDefaultValueSql("GETDATE()");
            builder.Property(p => p.IsActif).HasDefaultValue(true);
            builder.Property(p => p.TypeArticle).IsRequired().HasMaxLength(30).HasDefaultValue("Pièce de rechange");
            builder.Property(p => p.Unite).IsRequired().HasMaxLength(20).HasDefaultValue("pièce");
            builder.Property(p => p.Emplacement).HasMaxLength(50);
            builder.Property(p => p.ReferenceFournisseur).HasMaxLength(50);

            builder.HasOne(p => p.Magasin)
                   .WithMany()
                   .HasForeignKey(p => p.IdMagasin)
                   .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(p => p.Fournisseur)
                   .WithMany()
                   .HasForeignKey(p => p.IdFournisseur)
                   .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(p => p.FamillePiece)
                   .WithMany(f => f.Pieces)
                   .HasForeignKey(p => p.IDFamillePiece)
                   .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(p => p.Constructeur)
                   .WithMany(c => c.Pieces)
                   .HasForeignKey(p => p.IDConstructeur)
                   .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(p => p.CriticitePiece)
                   .WithMany(c => c.Pieces)
                   .HasForeignKey(p => p.IDCriticitePiece)
                   .OnDelete(DeleteBehavior.Restrict);
        }
    }
}