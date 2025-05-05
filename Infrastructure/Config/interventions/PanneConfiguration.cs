using Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Config
{
    public class PanneConfiguration : IEntityTypeConfiguration<Panne>
    {
        public void Configure(EntityTypeBuilder<Panne> builder)
        {
            builder.HasKey(p => p.IDPanne);
            builder.Property(p => p.Libelle).IsRequired().HasMaxLength(100);
            builder.Property(p => p.DateCreation).HasDefaultValueSql("GETDATE()");
            builder.Property(p => p.IsActif).HasDefaultValue(true);
        }
    }
}