namespace KPlista.Api.DTOs;

public record GroceryItemDto(
    Guid Id,
    string Name,
    string? Description,
    int Quantity,
    string? Unit,
    bool IsBought,
    Guid GroceryListId,
    Guid? GroupId,
    string? GroupName,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    DateTime? BoughtAt
);

public record CreateGroceryItemDto(
    string Name,
    string? Description,
    int Quantity,
    string? Unit,
    Guid? GroupId
);

public record UpdateGroceryItemDto(
    string Name,
    string? Description,
    int Quantity,
    string? Unit,
    Guid? GroupId
);

public record MarkItemBoughtDto(
    bool IsBought
);
