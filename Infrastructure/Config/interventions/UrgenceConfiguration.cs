using Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Config
{
    public class UrgenceConfiguration : IEntityTypeConfiguration<Urgence>
    {
        public void Configure(EntityTypeBuilder<Urgence> builder)
        {
            builder.HasKey(u => u.IDUrgence);
            builder.Property(u => u.Libelle).IsRequired().HasMaxLength(100);
            builder.Property(u => u.DateCreation).HasDefaultValueSql("GETDATE()");
            builder.Property(u => u.IsActif).HasDefaultValue(true);
        }
    }
}