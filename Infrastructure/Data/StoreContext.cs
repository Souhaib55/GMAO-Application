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
    public DbSet<Product> Products { get; set; }
    public DbSet<Equipment> Equipments { get; set; }
    public DbSet<FamilleEquipment> FamilleEquipments { get; set; }
    public DbSet<EquipmentCriticite> EquipmentCriticites { get; set; } 

    // Stock Module
   public DbSet<Stock> Stocks { get; set; }
    public DbSet<StockEntities> StockEntities { get; set; }
    public DbSet<StockStatus> StockStatuses { get; set; }
    public DbSet<StockSupplier> StockSuppliers { get; set; }



    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ProductConfiguration).Assembly);
    }
}