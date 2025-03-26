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
               .HasMaxLength(50); // Example constraint
        builder.Property(e => e.Designation)
               .IsRequired()
               .HasMaxLength(200); // Example constraint

        // Define the relationship with FamilleEquipment
        builder.HasOne(e => e.FamilleEquipment)
               .WithMany(fe => fe.Equipments)
               .HasForeignKey(e => e.FamilleEquipmentId)
               .OnDelete(DeleteBehavior.Cascade); // Cascade delete: if a family is deleted, its equipments are too
    }
}