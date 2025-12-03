using Core.Entities;
using Infrastructure.Config;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Data;

public class StoreContext : IdentityDbContext<AppUser, IdentityRole, string>
{
    public StoreContext(DbContextOptions<StoreContext> options) : base(options)
    {
    }
    // Users table    
    public DbSet<Users> Users { get; set; }

    // Roles table
    public DbSet<Role> Roles { get; set; }

    // Equipments Module
    public DbSet<Equipment> Equipments { get; set; }
    public DbSet<FamilleEquipment> FamilleEquipements { get; set; }
    public DbSet<EquipmentCriticite> EquipmentCriticites { get; set; }
    public DbSet<EtatEquipement> EtatEquipements { get; set; }
    public DbSet<Marque> Marques { get; set; }
    public DbSet<ModeleEquipement> ModeleEquipements { get; set; }
    public DbSet<GroupeEquipement> GroupeEquipements { get; set; }

    // Ressources Module
    public DbSet<Piece> Pieces { get; set; }
    public DbSet<FamillePiece> FamillePieces { get; set; }
    public DbSet<Constructeur> Constructeurs { get; set; }
    public DbSet<CriticitePiece> CriticitePieces { get; set; }

    // Stock Module
    public DbSet<Stock> Stocks { get; set; }
    public DbSet<StockEntities> StockEntities { get; set; }
    public DbSet<StockStatus> StockStatuses { get; set; }
    public DbSet<StockSupplier> StockSuppliers { get; set; }

    // Interventions Module
    public DbSet<TypeIntervention> TypeInterventions { get; set; }
    public DbSet<Urgence> Urgences { get; set; }
    public DbSet<Etat> Etats { get; set; }
    public DbSet<ChaineProduction> ChaineProductions { get; set; }
    public DbSet<DemandeIntervention> DemandeInterventions { get; set; }
    public DbSet<Panne> Pannes { get; set; }
    public DbSet<Status> Statuses { get; set; } // Add the Status entity

    // Notifications
    public DbSet<Notification> Notifications { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        // Users table
        modelBuilder.ApplyConfiguration(new UsersConfiguration());
        modelBuilder.ApplyConfiguration(new RoleConfiguration()); 

        // Equipments Module
        modelBuilder.ApplyConfiguration(new EquipmentConfiguration());
        modelBuilder.ApplyConfiguration(new EquipmentCriticiteConfiguration());
        modelBuilder.ApplyConfiguration(new EtatEquipementConfiguration());
        modelBuilder.ApplyConfiguration(new FamilleEquipmentConfiguration());
        modelBuilder.ApplyConfiguration(new GroupeEquipementConfiguration());
        modelBuilder.ApplyConfiguration(new MarqueConfiguration());
        modelBuilder.ApplyConfiguration(new ModeleEquipementConfiguration());

        // Ressources Module
        modelBuilder.ApplyConfiguration(new PieceConfiguration());
        modelBuilder.ApplyConfiguration(new FamillePieceConfiguration());
        modelBuilder.ApplyConfiguration(new ConstructeurConfiguration());
        modelBuilder.ApplyConfiguration(new CriticitePieceConfiguration());

        // Interventions Module
        modelBuilder.ApplyConfiguration(new TypeInterventionConfiguration());
        modelBuilder.ApplyConfiguration(new UrgenceConfiguration());
        modelBuilder.ApplyConfiguration(new EtatConfiguration());
        modelBuilder.ApplyConfiguration(new ChaineProductionConfiguration());
        modelBuilder.ApplyConfiguration(new DemandeInterventionConfiguration());
        modelBuilder.ApplyConfiguration(new PanneConfiguration());
        modelBuilder.ApplyConfiguration(new StatusConfiguration()); // Add the Status configuration

        // Notifications
        modelBuilder.ApplyConfiguration(new NotificationConfiguration());
    }
}