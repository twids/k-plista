namespace KPlista.Api.Models;

public class GroceryList
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public Guid OwnerId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string? ShareToken { get; set; }
    public bool ShareTokenCanEdit { get; set; } = false;

    // Navigation properties
    public User Owner { get; set; } = null!;
    public ICollection<GroceryItem> Items { get; set; } = new List<GroceryItem>();
    public ICollection<ItemGroup> Groups { get; set; } = new List<ItemGroup>();
    public ICollection<ListShare> Shares { get; set; } = new List<ListShare>();
}
