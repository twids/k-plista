namespace KPlista.Api.Models;

public class User
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? ProfilePictureUrl { get; set; }
    public string ExternalProvider { get; set; } = string.Empty; // Google, Facebook, Apple
    public string ExternalUserId { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public Guid? DefaultListId { get; set; }

    // Navigation properties
    public ICollection<GroceryList> OwnedLists { get; set; } = new List<GroceryList>();
    public ICollection<ListShare> SharedLists { get; set; } = new List<ListShare>();
    public ICollection<ApiKey> ApiKeys { get; set; } = new List<ApiKey>();
}
