namespace KPlista.Api.DTOs;

public record UserDto(
    Guid Id,
    string Email,
    string Name,
    string? ProfilePictureUrl
);

public record LoginResponse(
    Guid Id,
    string Email,
    string Name,
    string? ProfilePictureUrl,
    string Token
);
