using Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Config
{
    public class ConstructeurConfiguration : IEntityTypeConfiguration<Constructeur>
    {
        public void Configure(EntityTypeBuilder<Constructeur> builder)
        {
            builder.HasKey(c => c.IDConstructeur);
            builder.Property(c => c.NomConstructeur).IsRequired().HasMaxLength(100);
            builder.Property(c => c.Contact).HasMaxLength(100);
            builder.Property(c => c.DateCreation).HasDefaultValueSql("GETDATE()");
            builder.Property(c => c.IsActif).HasDefaultValue(true);
        }
    }
}