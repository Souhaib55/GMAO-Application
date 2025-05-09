using Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Config
{
    public class DemandeInterventionConfiguration : IEntityTypeConfiguration<DemandeIntervention>
    {
        public void Configure(EntityTypeBuilder<DemandeIntervention> builder)
        {
            builder.HasKey(d => d.IdDemandeIntervention);
            builder.Property(d => d.Titre).IsRequired().HasMaxLength(100);
            builder.Property(d => d.DateCreation).HasDefaultValueSql("GETDATE()");
            builder.Property(d => d.FileData).HasColumnType("varbinary(max)");
            builder.Property(d => d.FileName).HasMaxLength(255);
            builder.Property(d => d.ContentType).HasMaxLength(100);
            builder.Property(d => d.MachineArretee).IsRequired();
            builder.Property(d => d.IsActif).HasDefaultValue(true);
            builder.Property(d => d.DestinatairesID).IsRequired(false); // Make it optional
            
            // Add the new Status relationship
            builder.Property(d => d.StatusId).IsRequired().HasDefaultValue(1); // Default to "A traiter"
            builder.HasOne(d => d.Status)
                   .WithMany(s => s.DemandeInterventions)
                   .HasForeignKey(d => d.StatusId)
                   .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(d => d.Etat)
                   .WithMany()
                   .HasForeignKey(d => d.IDEtat)
                   .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(d => d.TypeIntervention)
                   .WithMany()
                   .HasForeignKey(d => d.IDTypeIntervention)
                   .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(d => d.Urgence)
                   .WithMany()
                   .HasForeignKey(d => d.IDUrgence)
                   .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(d => d.ChaineProduction)
                   .WithMany()
                   .HasForeignKey(d => d.IDChaineProduction)
                   .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(d => d.Panne)
                   .WithMany()
                   .HasForeignKey(d => d.IDPanne)
                   .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(d => d.Demandeur)
                   .WithMany()
                   .HasForeignKey(d => d.DemandeursID)
                   .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(d => d.Destinataire)
                   .WithMany()
                   .HasForeignKey(d => d.DestinatairesID)
                   .OnDelete(DeleteBehavior.SetNull);
        }
    }
}