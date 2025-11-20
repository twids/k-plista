namespace Koplista.Api.Models;

public class ItemGroup
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Icon { get; set; } // Emoji or icon for the group
    public string? Color { get; set; } // For UI visual grouping
    public int SortOrder { get; set; }
    public Guid GroceryListId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // Navigation properties
    public GroceryList GroceryList { get; set; } = null!;
    public ICollection<GroceryItem> Items { get; set; } = new List<GroceryItem>();
}
