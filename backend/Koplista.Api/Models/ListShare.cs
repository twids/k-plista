namespace Koplista.Api.Models;

public class ListShare
{
    public Guid Id { get; set; }
    public Guid GroceryListId { get; set; }
    public Guid SharedWithUserId { get; set; }
    public bool CanEdit { get; set; } = true;
    public DateTime SharedAt { get; set; }

    // Navigation properties
    public GroceryList GroceryList { get; set; } = null!;
    public User SharedWithUser { get; set; } = null!;
}
