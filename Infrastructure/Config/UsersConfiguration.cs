using Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Config;

public class UsersConfiguration : IEntityTypeConfiguration<Users>
{
    public void Configure(EntityTypeBuilder<Users> builder)
    {
        builder.HasKey(u => u.ID);
        builder.Property(u => u.Nom).IsRequired().HasMaxLength(50);
        builder.Property(u => u.Prenom).IsRequired().HasMaxLength(50);
        builder.Property(u => u.Email).IsRequired().HasMaxLength(100);
        builder.HasIndex(u => u.Email).IsUnique();
        builder.Property(u => u.DateCreation).IsRequired();
        builder.Property(u => u.DateModification).IsRequired();
        builder.Property(u => u.IsActif).IsRequired().HasDefaultValue(true);
        builder.HasOne(u => u.AppUser)
               .WithOne()
               .HasForeignKey<Users>(u => u.AppUserId)
               .OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(u => u.Role)
               .WithMany()
               .HasForeignKey(u => u.IDRole)
               .OnDelete(DeleteBehavior.Restrict);
    }
}