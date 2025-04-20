using Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Config
{
    public class FamillePieceConfiguration : IEntityTypeConfiguration<FamillePiece>
    {
        public void Configure(EntityTypeBuilder<FamillePiece> builder)
        {
            builder.HasKey(f => f.IDFamillePiece);
            builder.Property(f => f.NomFamille).IsRequired().HasMaxLength(100);
            builder.Property(f => f.Description).HasMaxLength(255);
            builder.Property(f => f.DateCreation).HasDefaultValueSql("GETDATE()");
            builder.Property(f => f.IsActif).HasDefaultValue(true);
        }
    }
}