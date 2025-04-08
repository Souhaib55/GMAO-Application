using Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Config
{
    public class FamilleEquipmentConfiguration : IEntityTypeConfiguration<FamilleEquipment>
    {
        public void Configure(EntityTypeBuilder<FamilleEquipment> builder)
        {
            builder.HasKey(f => f.IdFamille);
            builder.Property(f => f.NomFamille).IsRequired().HasMaxLength(100);
            builder.Property(f => f.Description).HasMaxLength(255);
            builder.Property(f => f.DateCreation).HasDefaultValueSql("GETDATE()");
            builder.Property(f => f.IsActif).HasDefaultValue(true);
        }
    }
}