using Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Config;

public class StockStatusConfiguration : IEntityTypeConfiguration<StockStatus>
{
    public void Configure(EntityTypeBuilder<StockStatus> builder)
    {
        builder.HasKey(ss => ss.Id);
        builder.Property(ss => ss.Status).IsRequired().HasMaxLength(50);
    }
}