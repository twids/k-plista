namespace KPlista.Api.DTOs;

public record AddItemExternalDto(
    string ItemName,
    Guid? ListId
);

public record AddItemExternalResponseDto(
    bool Success,
    GroceryItemDto Item
);
