using System;
using Core.Entities;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Config;

public class ProductConfiguration : IEntityTypeConfiguration<Product>
{
    public void Configure(Microsoft.EntityFrameworkCore.Metadata.Builders.EntityTypeBuilder<Product> builder)
    {
        builder.Property(p => p.Price).HasColumnType("decimal(18,2)");  // Be specefic for each proprety of the Product class which is a table in gmao database and you can also add IsRequired() for each proprety
    }
}
