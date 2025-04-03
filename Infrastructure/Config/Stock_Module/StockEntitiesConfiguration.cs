using Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Config;

public class StockEntitiesConfiguration : IEntityTypeConfiguration<StockEntities>
{
    public void Configure(EntityTypeBuilder<StockEntities> builder)
    {
        builder.HasKey(se => se.Id);
        builder.Property(se => se.Name).IsRequired().HasMaxLength(100);
    }
}