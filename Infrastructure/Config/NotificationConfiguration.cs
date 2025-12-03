using Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Config;

public class NotificationConfiguration : IEntityTypeConfiguration<Notification>
{
    public void Configure(EntityTypeBuilder<Notification> builder)
    {
        builder.HasKey(n => n.Id);
        builder.Property(n => n.Title).IsRequired().HasMaxLength(200);
        builder.Property(n => n.Message).IsRequired().HasMaxLength(1000);
        builder.Property(n => n.Type).IsRequired().HasMaxLength(50);
        builder.Property(n => n.CreatedAt).IsRequired();
        builder.Property(n => n.IsRead).IsRequired().HasDefaultValue(false);
        
        builder.HasOne(n => n.User)
               .WithMany()
               .HasForeignKey(n => n.UserId)
               .OnDelete(DeleteBehavior.Cascade);
               
        builder.HasOne(n => n.TriggeredByUser)
               .WithMany()
               .HasForeignKey(n => n.TriggeredByUserId)
               .OnDelete(DeleteBehavior.NoAction);
               
        builder.HasOne(n => n.Intervention)
               .WithMany()
               .HasForeignKey(n => n.InterventionId)
               .OnDelete(DeleteBehavior.SetNull);
               
        builder.HasIndex(n => n.UserId);
        builder.HasIndex(n => n.IsRead);
        builder.HasIndex(n => n.CreatedAt);
    }
}
