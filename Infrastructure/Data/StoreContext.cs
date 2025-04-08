using Core.Entities;
using Infrastructure.Config;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Data;

public class StoreContext : IdentityDbContext<AppUser>
{
    public StoreContext(DbContextOptions<StoreContext> options) : base(options)
    {
    }


    // Equipemnts Module
        public DbSet<Equipment> Equipments { get; set; }
        public DbSet<FamilleEquipment> FamilleEquipements { get; set; }
        public DbSet<EquipmentCriticite> EquipmentCriticites { get; set; }
        public DbSet<EtatEquipement> EtatEquipements { get; set; }
        public DbSet<Marque> Marques { get; set; }
        public DbSet<ModeleEquipement> ModeleEquipements { get; set; }
        public DbSet<GroupeEquipement> GroupeEquipements { get; set; }

    // Stock Module
   public DbSet<Stock> Stocks { get; set; }
    public DbSet<StockEntities> StockEntities { get; set; }
    public DbSet<StockStatus> StockStatuses { get; set; }
    public DbSet<StockSupplier> StockSuppliers { get; set; }



    protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            modelBuilder.ApplyConfiguration(new EquipmentConfiguration());
            modelBuilder.ApplyConfiguration(new EquipmentCriticiteConfiguration());
            modelBuilder.ApplyConfiguration(new EtatEquipementConfiguration());
            modelBuilder.ApplyConfiguration(new FamilleEquipmentConfiguration());
            modelBuilder.ApplyConfiguration(new GroupeEquipementConfiguration());
            modelBuilder.ApplyConfiguration(new MarqueConfiguration());
            modelBuilder.ApplyConfiguration(new ModeleEquipementConfiguration());
        }
    
}