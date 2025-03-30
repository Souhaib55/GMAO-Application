using Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Config;

public class EquipmentConfiguration : IEntityTypeConfiguration<Equipment>
{
    public void Configure(EntityTypeBuilder<Equipment> builder)
    {
        builder.HasKey(e => e.Id);
        builder.Property(e => e.Code)
               .IsRequired()
               .HasMaxLength(50);
        builder.Property(e => e.Designation)
               .IsRequired()
               .HasMaxLength(200);

        // Relationship with FamilleEquipment
        builder.HasOne(e => e.FamilleEquipment)
               .WithMany(fe => fe.Equipments)
               .HasForeignKey(e => e.FamilleEquipmentId)
               .OnDelete(DeleteBehavior.Cascade);

        // Relationship with EquipmentCriticite
        builder.HasOne(e => e.EquipmentCriticite)
               .WithMany(ec => ec.Equipments)
               .HasForeignKey(e => e.EquipmentCriticiteId)
               .OnDelete(DeleteBehavior.Cascade); // Cascade delete
    }
}