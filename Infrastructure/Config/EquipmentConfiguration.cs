using Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Config
{
    public class EquipmentConfiguration : IEntityTypeConfiguration<Equipment>
    {
        public void Configure(EntityTypeBuilder<Equipment> builder)
        {
            builder.HasKey(e => e.IdEquipement);
            builder.Property(e => e.CodeEquipement).IsRequired().HasMaxLength(50);
            builder.HasIndex(e => e.CodeEquipement).IsUnique();
            builder.Property(e => e.Designation).IsRequired().HasMaxLength(100);
            builder.Property(e => e.Description).HasMaxLength(255);
            builder.Property(e => e.NumeroSerie).HasMaxLength(100);
            builder.Property(e => e.DateCreation).HasDefaultValueSql("GETDATE()");
            builder.Property(e => e.IsDeleted).HasDefaultValue(false);
            builder.Property(e => e.CoutAchat).HasPrecision(18, 2); // Add this line

            builder.HasOne(e => e.Criticite)
                   .WithMany(c => c.Equipments)
                   .HasForeignKey(e => e.IdCriticite)
                   .OnDelete(DeleteBehavior.Restrict);
            builder.HasOne(e => e.Etat)
                   .WithMany(e => e.Equipments)
                   .HasForeignKey(e => e.IdEtat)
                   .OnDelete(DeleteBehavior.Restrict);
            builder.HasOne(e => e.Famille)
                   .WithMany(f => f.Equipments)
                   .HasForeignKey(e => e.IdFamille)
                   .OnDelete(DeleteBehavior.Restrict);
            builder.HasOne(e => e.Modele)
                   .WithMany(m => m.Equipments)
                   .HasForeignKey(e => e.IdModele)
                   .OnDelete(DeleteBehavior.Restrict);
            builder.HasOne(e => e.ChaineProduction)
                   .WithMany()
                   .HasForeignKey(e => e.IdChaineProduction)
                   .IsRequired(false)
                   .OnDelete(DeleteBehavior.Restrict);
            builder.Property(e => e.Emplacement).HasMaxLength(100);
            builder.HasOne(e => e.Fournisseur)
                   .WithMany()
                   .HasForeignKey(e => e.IdFournisseur)
                   .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(e => e.Groupe)
                   .WithMany(g => g.Equipments)
                   .HasForeignKey(e => e.IdGroupe)
                   .OnDelete(DeleteBehavior.Restrict);
        }
    }
}