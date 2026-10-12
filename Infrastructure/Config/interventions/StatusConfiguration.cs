// 3. Status Configuration (Infrastructure/Config/interventions/StatusConfiguration.cs)
using Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Config
{
    public class StatusConfiguration : IEntityTypeConfiguration<Status>
    {
        public void Configure(EntityTypeBuilder<Status> builder)
        {
            builder.HasKey(s => s.Id);
            builder.Property(s => s.Statut).IsRequired().HasMaxLength(50);
            builder.Property(s => s.Description).HasMaxLength(255);
            builder.Property(s => s.IsActif).HasDefaultValue(true);
            
            // Seed initial status values
            builder.HasData(
                new Status { Id = 1, Statut = "À traiter", Description = "Nouvelle demande d'intervention", IsActif = true },
                new Status { Id = 2, Statut = "En cours", Description = "Intervention assignée à un technicien", IsActif = true },
                new Status { Id = 3, Statut = "Réalisée", Description = "Intervention terminée par le technicien", IsActif = true },
                new Status { Id = 4, Statut = "Clôturée", Description = "Intervention validée par le superviseur", IsActif = true },
                new Status { Id = 5, Statut = "Annulée", Description = "Intervention annulée", IsActif = true }
            );
        }
    }
}