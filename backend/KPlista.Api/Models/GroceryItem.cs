namespace KPlista.Api.Models;

public class GroceryItem
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int Quantity { get; set; } = 1;
    public string? Unit { get; set; }
    public bool IsBought { get; set; } = false;
    public Guid GroceryListId { get; set; }
    public Guid? GroupId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? BoughtAt { get; set; }

    // Navigation properties
    public GroceryList GroceryList { get; set; } = null!;
    public ItemGroup? Group { get; set; }
}
