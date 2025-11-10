namespace KPlista.Api.DTOs;

public record GroceryListDto(
    Guid Id,
    string Name,
    string? Description,
    Guid OwnerId,
    string OwnerName,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    int ItemCount,
    int BoughtItemCount,
    bool IsShared
);

public record CreateGroceryListDto(
    string Name,
    string? Description
);

public record UpdateGroceryListDto(
    string Name,
    string? Description
);
