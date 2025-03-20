using System;
using Core.Entities;    // get the Product class from Core.Entities
using Infrastructure.Config;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore; // IdentityDbContext pre-installed from Microsoft.AspNetCore.Identity.EntityFrameworkCore from Nuget Package
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Data;

public class StoreContext(DbContextOptions options) : IdentityDbContext<AppUser>(options)
{
    // (DbContextOptions options) is a constructor in a new way

    public DbSet<Product> Products { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ProductConfiguration).Assembly); // aply any configuration to Product table in gmao database based on Product Configuration inside Infrastructure/Config/ProductConfiguration.cs
    }



}
