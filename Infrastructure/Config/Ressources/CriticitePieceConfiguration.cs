using Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Config
{
    public class CriticitePieceConfiguration : IEntityTypeConfiguration<CriticitePiece>
    {
        public void Configure(EntityTypeBuilder<CriticitePiece> builder)
        {
            builder.HasKey(c => c.IDCriticitePiece);
            builder.Property(c => c.NiveauCriticitePiece).IsRequired().HasMaxLength(50);
            builder.Property(c => c.Description).HasMaxLength(255);
            builder.Property(c => c.DateCreation).HasDefaultValueSql("GETDATE()");
            builder.Property(c => c.IsActif).HasDefaultValue(true);
        }
    }
}