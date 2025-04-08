using Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Config
{
    public class MarqueConfiguration : IEntityTypeConfiguration<Marque>
    {
        public void Configure(EntityTypeBuilder<Marque> builder)
        {
            builder.HasKey(m => m.IdMarque);
            builder.Property(m => m.NomMarque).IsRequired().HasMaxLength(100);
            builder.Property(m => m.DateCreation).HasDefaultValueSql("GETDATE()");
            builder.Property(m => m.IsActif).HasDefaultValue(true);
        }
    }
}