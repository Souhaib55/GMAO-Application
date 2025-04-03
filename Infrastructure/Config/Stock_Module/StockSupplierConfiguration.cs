using Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Config;

public class StockSupplierConfiguration : IEntityTypeConfiguration<StockSupplier>
{
    public void Configure(EntityTypeBuilder<StockSupplier> builder)
    {
        builder.HasKey(ss => ss.Id);
        builder.Property(ss => ss.SupplierName).IsRequired().HasMaxLength(100);
    }
}