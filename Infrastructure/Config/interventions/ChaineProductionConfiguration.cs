using Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Config
{
    public class ChaineProductionConfiguration : IEntityTypeConfiguration<ChaineProduction>
    {
        public void Configure(EntityTypeBuilder<ChaineProduction> builder)
        {
            builder.HasKey(c => c.IDChaineProduction);
            builder.Property(c => c.Libelle).IsRequired().HasMaxLength(100);
            builder.Property(c => c.DateCreation).HasDefaultValueSql("GETDATE()");
            builder.Property(c => c.IsActif).HasDefaultValue(true);
        }
    }
}