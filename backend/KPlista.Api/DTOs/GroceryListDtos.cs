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
    bool IsShared,
    bool AutoRemoveBoughtItemsEnabled,
    int AutoRemoveBoughtItemsDelayMinutes
);

public record CreateGroceryListDto(
    string Name,
    string? Description,
    bool AutoRemoveBoughtItemsEnabled = false,
    int AutoRemoveBoughtItemsDelayMinutes = 360
);

public record UpdateGroceryListDto(
    string Name,
    string? Description,
    bool? AutoRemoveBoughtItemsEnabled = null,
    int? AutoRemoveBoughtItemsDelayMinutes = null
);

public record MagicLinkDto(
    string ShareToken,
    string ShareUrl,
    bool CanEdit
);

public record GenerateMagicLinkDto(
    bool CanEdit
);

public record AcceptShareDto(
    Guid ListId,
    string ListName,
    string OwnerName
);
