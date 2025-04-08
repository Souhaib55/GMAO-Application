using Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Config
{
    public class ModeleEquipementConfiguration : IEntityTypeConfiguration<ModeleEquipement>
    {
        public void Configure(EntityTypeBuilder<ModeleEquipement> builder)
        {
            builder.HasKey(m => m.IdModele);
            builder.Property(m => m.NomModele).IsRequired().HasMaxLength(100);
            builder.Property(m => m.Commentaire).HasMaxLength(4000); // VARCHAR(MAX) equivalent
            builder.HasOne(m => m.Marque)
                   .WithMany(m => m.Modeles)
                   .HasForeignKey(m => m.IdMarque)
                   .OnDelete(DeleteBehavior.Restrict);
            builder.HasOne(m => m.Famille)
                   .WithMany(f => f.Modeles)
                   .HasForeignKey(m => m.IdFamille)
                   .OnDelete(DeleteBehavior.Restrict);
            builder.HasOne(m => m.Criticite)
                   .WithMany(c => c.Modeles)
                   .HasForeignKey(m => m.IdCriticite)
                   .OnDelete(DeleteBehavior.Restrict);
            builder.Property(m => m.DateCreation).HasDefaultValueSql("GETDATE()");
            builder.Property(m => m.IsActif).HasDefaultValue(true);
        }
    }
}