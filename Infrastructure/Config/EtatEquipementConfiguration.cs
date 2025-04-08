using Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Config
{
    public class EtatEquipementConfiguration : IEntityTypeConfiguration<EtatEquipement>
    {
        public void Configure(EntityTypeBuilder<EtatEquipement> builder)
        {
            builder.HasKey(e => e.IdEtat);
            builder.Property(e => e.NomEtat).IsRequired().HasMaxLength(50);
            builder.Property(e => e.Description).HasMaxLength(255);
            builder.Property(e => e.DateCreation).HasDefaultValueSql("GETDATE()");
            builder.Property(e => e.IsActif).HasDefaultValue(true);
        }
    }
}