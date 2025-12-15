using Microsoft.EntityFrameworkCore;
using KPlista.Api.Models;

namespace KPlista.Api.Data;

public class KPlistaDbContext : DbContext
{
    public KPlistaDbContext(DbContextOptions<KPlistaDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users { get; set; }
    public DbSet<GroceryList> GroceryLists { get; set; }
    public DbSet<GroceryItem> GroceryItems { get; set; }
    public DbSet<ItemGroup> ItemGroups { get; set; }
    public DbSet<ListShare> ListShares { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // User configuration
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Email).IsUnique();
            entity.HasIndex(e => new { e.ExternalProvider, e.ExternalUserId }).IsUnique();
            entity.Property(e => e.Email).IsRequired().HasMaxLength(256);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
            entity.Property(e => e.ExternalProvider).IsRequired().HasMaxLength(50);
            entity.Property(e => e.ExternalUserId).IsRequired().HasMaxLength(256);
        });

        // GroceryList configuration
        modelBuilder.Entity<GroceryList>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.ShareToken).HasMaxLength(100);
            entity.HasIndex(e => e.ShareToken).IsUnique();
            entity.HasOne(e => e.Owner)
                .WithMany(u => u.OwnedLists)
                .HasForeignKey(e => e.OwnerId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // GroceryItem configuration
        modelBuilder.Entity<GroceryItem>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Unit).HasMaxLength(50);
            entity.HasOne(e => e.GroceryList)
                .WithMany(gl => gl.Items)
                .HasForeignKey(e => e.GroceryListId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Group)
                .WithMany(g => g.Items)
                .HasForeignKey(e => e.GroupId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // ItemGroup configuration
        modelBuilder.Entity<ItemGroup>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Color).HasMaxLength(20);
            entity.HasOne(e => e.GroceryList)
                .WithMany(gl => gl.Groups)
                .HasForeignKey(e => e.GroceryListId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ListShare configuration
        modelBuilder.Entity<ListShare>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.GroceryList)
                .WithMany(gl => gl.Shares)
                .HasForeignKey(e => e.GroceryListId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.SharedWithUser)
                .WithMany(u => u.SharedLists)
                .HasForeignKey(e => e.SharedWithUserId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(e => new { e.GroceryListId, e.SharedWithUserId }).IsUnique();
        });
    }
}
