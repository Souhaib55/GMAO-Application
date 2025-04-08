using Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Config
{
    public class EquipmentCriticiteConfiguration : IEntityTypeConfiguration<EquipmentCriticite>
    {
        public void Configure(EntityTypeBuilder<EquipmentCriticite> builder)
        {
            builder.HasKey(c => c.IdCriticite);
            builder.Property(c => c.NomCriticite).IsRequired().HasMaxLength(50);
            builder.Property(c => c.Description).HasMaxLength(255);
            builder.Property(c => c.DateCreation).HasDefaultValueSql("GETDATE()");
            builder.Property(c => c.IsActif).HasDefaultValue(true);
        }
    }
}