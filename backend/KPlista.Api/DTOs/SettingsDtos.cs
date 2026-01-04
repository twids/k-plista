namespace KPlista.Api.DTOs;

public record ApiKeyDto(
    Guid Id,
    string Name,
    DateTime CreatedAt,
    DateTime? LastUsedAt
);

public record CreateApiKeyDto(
    string Name
);

public record CreateApiKeyResponseDto(
    Guid Id,
    string Name,
    string Key,
    DateTime CreatedAt
);

public record DefaultListDto(
    Guid? ListId
);
