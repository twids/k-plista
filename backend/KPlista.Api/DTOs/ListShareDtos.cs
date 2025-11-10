namespace KPlista.Api.DTOs;

public record ListShareDto(
    Guid Id,
    Guid GroceryListId,
    string GroceryListName,
    Guid SharedWithUserId,
    string SharedWithUserEmail,
    string SharedWithUserName,
    bool CanEdit,
    DateTime SharedAt
);

public record CreateListShareDto(
    string SharedWithUserEmail,
    bool CanEdit
);

public record UpdateListShareDto(
    bool CanEdit
);
