using Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Config;

public class FamilleEquipmentConfiguration : IEntityTypeConfiguration<FamilleEquipment>
{
    public void Configure(EntityTypeBuilder<FamilleEquipment> builder)
    {
        builder.HasKey(fe => fe.Id);
        builder.Property(fe => fe.LibelleFamille)
               .IsRequired()
               .HasMaxLength(100); // Example constraint
    }
}