namespace KPlista.Api.DTOs;

public record ItemGroupDto(
    Guid Id,
    string Name,
    string? Icon,
    string? Color,
    int SortOrder,
    Guid GroceryListId,
    int ItemCount,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record CreateItemGroupDto(
    string Name,
    string? Icon,
    string? Color,
    int SortOrder
);

public record UpdateItemGroupDto(
    string Name,
    string? Icon,
    string? Color,
    int SortOrder
);
