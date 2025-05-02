using Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Config
{
    public class RoleConfiguration : IEntityTypeConfiguration<Role>
    {
        public void Configure(EntityTypeBuilder<Role> builder)
        {
            builder.HasKey(r => r.IDRole); // Define IDRole as the primary key
            builder.Property(r => r.Libelle).IsRequired().HasMaxLength(50); // Optional: Configure other properties
        }
    }
}
