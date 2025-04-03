using Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Config;

public class StockConfiguration : IEntityTypeConfiguration<Stock>
{
    public void Configure(EntityTypeBuilder<Stock> builder)
    {
        builder.HasKey(s => s.Id);
        builder.Property(s => s.Code).IsRequired().HasMaxLength(50);
        builder.Property(s => s.Description).IsRequired().HasMaxLength(200);
        builder.Property(s => s.CreatedOn).HasColumnType("datetime").HasDefaultValueSql("GETDATE()");
        builder.HasOne(s => s.StockEntities)
               .WithMany(se => se.Stocks)
               .HasForeignKey(s => s.StockEntitiesId)
               .OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(s => s.StockStatus)
               .WithMany(ss => ss.Stocks)
               .HasForeignKey(s => s.StockStatusId)
               .OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(s => s.StockSupplier)
               .WithMany(ss => ss.Stocks)
               .HasForeignKey(s => s.StockSupplierId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}