using Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Config
{
    public class EtatConfiguration : IEntityTypeConfiguration<Etat>
    {
        public void Configure(EntityTypeBuilder<Etat> builder)
        {
            builder.HasKey(e => e.IDEtat);
            builder.Property(e => e.Libelle).IsRequired().HasMaxLength(100);
            builder.Property(e => e.DateCreation).HasDefaultValueSql("GETDATE()");
            builder.Property(e => e.IsActif).HasDefaultValue(true);
        }
    }
}