using Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Config
{
    // ------------------------------------------------------------------
    // Magasin
    // ------------------------------------------------------------------

    public class MagasinConfiguration : IEntityTypeConfiguration<Magasin>
    {
        public void Configure(EntityTypeBuilder<Magasin> builder)
        {
            builder.ToTable("Magasins");
            builder.Property(m => m.Code).IsRequired().HasMaxLength(20);
            builder.HasIndex(m => m.Code).IsUnique();
            builder.Property(m => m.Nom).IsRequired().HasMaxLength(100);
            builder.Property(m => m.Description).HasMaxLength(255);
            builder.Property(m => m.IsActif).HasDefaultValue(true);
            builder.Property(m => m.DateCreation).HasDefaultValueSql("GETDATE()");
        }
    }

    public class FournisseurConfiguration : IEntityTypeConfiguration<Fournisseur>
    {
        public void Configure(EntityTypeBuilder<Fournisseur> builder)
        {
            builder.ToTable("Fournisseurs");
            builder.Property(f => f.Code).IsRequired().HasMaxLength(20);
            builder.HasIndex(f => f.Code).IsUnique();
            builder.Property(f => f.Nom).IsRequired().HasMaxLength(150);
            builder.Property(f => f.Contact).HasMaxLength(100);
            builder.Property(f => f.Telephone).HasMaxLength(30);
            builder.Property(f => f.Email).HasMaxLength(150);
            builder.Property(f => f.Adresse).HasMaxLength(255);
            builder.Property(f => f.Notes).HasMaxLength(1000);
            builder.Property(f => f.IsActif).HasDefaultValue(true);
            builder.Property(f => f.DateCreation).HasDefaultValueSql("GETDATE()");
        }
    }

    public class MouvementStockConfiguration : IEntityTypeConfiguration<MouvementStock>
    {
        public void Configure(EntityTypeBuilder<MouvementStock> builder)
        {
            builder.ToTable("MouvementsStock");
            builder.Property(m => m.Type).IsRequired().HasMaxLength(30);
            builder.Property(m => m.PrixUnitaire).HasPrecision(12, 3);
            builder.Property(m => m.Motif).HasMaxLength(255);
            builder.HasIndex(m => new { m.IdPiece, m.Date });
            builder.HasIndex(m => m.Date);

            builder.HasOne(m => m.Piece).WithMany().HasForeignKey(m => m.IdPiece).OnDelete(DeleteBehavior.Restrict);
            builder.HasOne(m => m.DemandeIntervention).WithMany().HasForeignKey(m => m.IdDemandeIntervention).OnDelete(DeleteBehavior.Restrict);
            builder.HasOne(m => m.BonCommande).WithMany().HasForeignKey(m => m.IdBonCommande).OnDelete(DeleteBehavior.Restrict);
            builder.HasOne(m => m.Utilisateur).WithMany().HasForeignKey(m => m.UtilisateurId).OnDelete(DeleteBehavior.Restrict);
        }
    }

    // ------------------------------------------------------------------
    // Work order follow-up
    // ------------------------------------------------------------------

    public class InterventionTempsConfiguration : IEntityTypeConfiguration<InterventionTemps>
    {
        public void Configure(EntityTypeBuilder<InterventionTemps> builder)
        {
            builder.ToTable("InterventionTemps");
            builder.Property(t => t.TauxHoraire).HasPrecision(10, 3);
            builder.Property(t => t.Commentaire).HasMaxLength(500);
            builder.HasOne(t => t.DemandeIntervention).WithMany(d => d.Temps).HasForeignKey(t => t.IdDemandeIntervention).OnDelete(DeleteBehavior.Cascade);
            builder.HasOne(t => t.Technicien).WithMany().HasForeignKey(t => t.IdTechnicien).OnDelete(DeleteBehavior.Restrict);
        }
    }

    public class InterventionPieceConfiguration : IEntityTypeConfiguration<InterventionPiece>
    {
        public void Configure(EntityTypeBuilder<InterventionPiece> builder)
        {
            builder.ToTable("InterventionPieces");
            builder.Property(p => p.PrixUnitaire).HasPrecision(12, 3);
            builder.HasOne(p => p.DemandeIntervention).WithMany(d => d.PiecesConsommees).HasForeignKey(p => p.IdDemandeIntervention).OnDelete(DeleteBehavior.Cascade);
            builder.HasOne(p => p.Piece).WithMany().HasForeignKey(p => p.IdPiece).OnDelete(DeleteBehavior.Restrict);
        }
    }

    public class InterventionTacheConfiguration : IEntityTypeConfiguration<InterventionTache>
    {
        public void Configure(EntityTypeBuilder<InterventionTache> builder)
        {
            builder.ToTable("InterventionTaches");
            builder.Property(t => t.Libelle).IsRequired().HasMaxLength(255);
            builder.HasOne(t => t.DemandeIntervention).WithMany(d => d.Taches).HasForeignKey(t => t.IdDemandeIntervention).OnDelete(DeleteBehavior.Cascade);
        }
    }

    // ------------------------------------------------------------------
    // Preventive maintenance
    // ------------------------------------------------------------------

    public class PlanPreventifConfiguration : IEntityTypeConfiguration<PlanPreventif>
    {
        public void Configure(EntityTypeBuilder<PlanPreventif> builder)
        {
            builder.ToTable("PlansPreventifs");
            builder.Property(p => p.Code).IsRequired().HasMaxLength(20);
            builder.HasIndex(p => p.Code).IsUnique();
            builder.Property(p => p.Titre).IsRequired().HasMaxLength(150);
            builder.Property(p => p.Description).HasMaxLength(2000);
            builder.Property(p => p.Frequence).IsRequired().HasMaxLength(10);
            builder.Property(p => p.Intervalle).HasDefaultValue(1);
            builder.Property(p => p.DelaiGenerationJours).HasDefaultValue(7);
            builder.Property(p => p.IsActif).HasDefaultValue(true);
            builder.Property(p => p.DateCreation).HasDefaultValueSql("GETDATE()");
            builder.HasIndex(p => new { p.IsActif, p.ProchaineEcheance });

            builder.HasOne(p => p.Equipement).WithMany().HasForeignKey(p => p.IdEquipement).OnDelete(DeleteBehavior.Restrict);
            builder.HasOne(p => p.TypeIntervention).WithMany().HasForeignKey(p => p.IdTypeIntervention).OnDelete(DeleteBehavior.Restrict);
            builder.HasOne(p => p.Technicien).WithMany().HasForeignKey(p => p.IdTechnicien).OnDelete(DeleteBehavior.Restrict);
        }
    }

    public class PlanPreventifTacheConfiguration : IEntityTypeConfiguration<PlanPreventifTache>
    {
        public void Configure(EntityTypeBuilder<PlanPreventifTache> builder)
        {
            builder.ToTable("PlanPreventifTaches");
            builder.Property(t => t.Libelle).IsRequired().HasMaxLength(255);
            builder.HasOne(t => t.PlanPreventif).WithMany(p => p.Taches).HasForeignKey(t => t.IdPlanPreventif).OnDelete(DeleteBehavior.Cascade);
        }
    }

    // ------------------------------------------------------------------
    // Purchasing and budgets
    // ------------------------------------------------------------------

    public class DemandeAchatConfiguration : IEntityTypeConfiguration<DemandeAchat>
    {
        public void Configure(EntityTypeBuilder<DemandeAchat> builder)
        {
            builder.ToTable("DemandesAchat");
            builder.Property(d => d.Numero).IsRequired().HasMaxLength(20);
            builder.HasIndex(d => d.Numero).IsUnique();
            builder.Property(d => d.Statut).IsRequired().HasMaxLength(20);
            builder.Property(d => d.Motif).HasMaxLength(1000);
            builder.Property(d => d.CommentaireDecision).HasMaxLength(500);
            builder.HasOne(d => d.Demandeur).WithMany().HasForeignKey(d => d.IdDemandeur).OnDelete(DeleteBehavior.Restrict);
            builder.HasOne(d => d.DemandeIntervention).WithMany().HasForeignKey(d => d.IdDemandeIntervention).OnDelete(DeleteBehavior.Restrict);
        }
    }

    public class DemandeAchatLigneConfiguration : IEntityTypeConfiguration<DemandeAchatLigne>
    {
        public void Configure(EntityTypeBuilder<DemandeAchatLigne> builder)
        {
            builder.ToTable("DemandeAchatLignes");
            builder.Property(l => l.Designation).IsRequired().HasMaxLength(150);
            builder.Property(l => l.PrixEstime).HasPrecision(12, 3);
            builder.HasOne(l => l.DemandeAchat).WithMany(d => d.Lignes).HasForeignKey(l => l.IdDemandeAchat).OnDelete(DeleteBehavior.Cascade);
            builder.HasOne(l => l.Piece).WithMany().HasForeignKey(l => l.IdPiece).OnDelete(DeleteBehavior.Restrict);
        }
    }

    public class BonCommandeConfiguration : IEntityTypeConfiguration<BonCommande>
    {
        public void Configure(EntityTypeBuilder<BonCommande> builder)
        {
            builder.ToTable("BonsCommande");
            builder.Property(b => b.Numero).IsRequired().HasMaxLength(20);
            builder.HasIndex(b => b.Numero).IsUnique();
            builder.Property(b => b.Statut).IsRequired().HasMaxLength(20);
            builder.Property(b => b.Notes).HasMaxLength(1000);
            builder.Property(b => b.DateCreation).HasDefaultValueSql("GETDATE()");
            builder.HasOne(b => b.Fournisseur).WithMany().HasForeignKey(b => b.IdFournisseur).OnDelete(DeleteBehavior.Restrict);
            builder.HasOne(b => b.DemandeAchat).WithMany().HasForeignKey(b => b.IdDemandeAchat).OnDelete(DeleteBehavior.Restrict);
        }
    }

    public class BonCommandeLigneConfiguration : IEntityTypeConfiguration<BonCommandeLigne>
    {
        public void Configure(EntityTypeBuilder<BonCommandeLigne> builder)
        {
            builder.ToTable("BonCommandeLignes");
            builder.Property(l => l.Designation).IsRequired().HasMaxLength(150);
            builder.Property(l => l.PrixUnitaire).HasPrecision(12, 3);
            builder.HasOne(l => l.BonCommande).WithMany(b => b.Lignes).HasForeignKey(l => l.IdBonCommande).OnDelete(DeleteBehavior.Cascade);
            builder.HasOne(l => l.Piece).WithMany().HasForeignKey(l => l.IdPiece).OnDelete(DeleteBehavior.Restrict);
        }
    }

    public class BudgetConfiguration : IEntityTypeConfiguration<Budget>
    {
        public void Configure(EntityTypeBuilder<Budget> builder)
        {
            builder.ToTable("Budgets");
            builder.Property(b => b.Categorie).IsRequired().HasMaxLength(30);
            builder.Property(b => b.Montant).HasPrecision(14, 3);
            builder.Property(b => b.Notes).HasMaxLength(500);
            builder.HasIndex(b => new { b.Annee, b.Categorie, b.IdChaineProduction }).IsUnique();
            builder.HasOne(b => b.ChaineProduction).WithMany().HasForeignKey(b => b.IdChaineProduction).OnDelete(DeleteBehavior.Restrict);
        }
    }

    // ------------------------------------------------------------------
    // Cross-cutting
    // ------------------------------------------------------------------

    public class PieceJointeConfiguration : IEntityTypeConfiguration<PieceJointe>
    {
        public void Configure(EntityTypeBuilder<PieceJointe> builder)
        {
            builder.ToTable("PiecesJointes");
            builder.Property(p => p.Entite).IsRequired().HasMaxLength(30);
            builder.Property(p => p.NomFichier).IsRequired().HasMaxLength(255);
            builder.Property(p => p.ContentType).IsRequired().HasMaxLength(100);
            builder.Property(p => p.Donnees).IsRequired();
            builder.HasIndex(p => new { p.Entite, p.EntiteId });
        }
    }

    public class JournalActiviteConfiguration : IEntityTypeConfiguration<JournalActivite>
    {
        public void Configure(EntityTypeBuilder<JournalActivite> builder)
        {
            builder.ToTable("JournalActivites");
            builder.Property(j => j.UtilisateurNom).HasMaxLength(150);
            builder.Property(j => j.Entite).IsRequired().HasMaxLength(30);
            builder.Property(j => j.Action).IsRequired().HasMaxLength(60);
            builder.Property(j => j.Details).HasMaxLength(1000);
            builder.HasIndex(j => j.Date);
            builder.HasIndex(j => new { j.Entite, j.EntiteId });
        }
    }

    public class ParametreApplicationConfiguration : IEntityTypeConfiguration<ParametreApplication>
    {
        public void Configure(EntityTypeBuilder<ParametreApplication> builder)
        {
            builder.ToTable("ParametresApplication");
            builder.HasKey(p => p.Cle);
            builder.Property(p => p.Cle).HasMaxLength(100);
        }
    }
}
