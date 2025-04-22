using Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Config
{
    public class TypeInterventionConfiguration : IEntityTypeConfiguration<TypeIntervention>
    {
        public void Configure(EntityTypeBuilder<TypeIntervention> builder)
        {
            builder.HasKey(t => t.IDTypeIntervention);
            builder.Property(t => t.Libelle).IsRequired().HasMaxLength(100);
            builder.Property(t => t.DateCreation).HasDefaultValueSql("GETDATE()");
            builder.Property(t => t.IsActif).HasDefaultValue(true);
        }
    }
}