using Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Config
{
    public class GroupeEquipementConfiguration : IEntityTypeConfiguration<GroupeEquipement>
    {
        public void Configure(EntityTypeBuilder<GroupeEquipement> builder)
        {
            builder.HasKey(g => g.IdGroupe);
            builder.Property(g => g.NomGroupe).IsRequired().HasMaxLength(100);
            builder.Property(g => g.Description).HasMaxLength(255);
            builder.Property(g => g.DateCreation).HasDefaultValueSql("GETDATE()");
            builder.Property(g => g.IsActif).HasDefaultValue(true);
        }
    }
}