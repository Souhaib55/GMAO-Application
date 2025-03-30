using Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Config;

public class EquipmentCriticiteConfiguration : IEntityTypeConfiguration<EquipmentCriticite>
{
    public void Configure(EntityTypeBuilder<EquipmentCriticite> builder)
    {
        builder.HasKey(ec => ec.Id);
        builder.Property(ec => ec.CriticiteLevel)
               .IsRequired()
               .HasMaxLength(50); // Example constraint
    }
}