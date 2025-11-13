namespace KPlista.Api.DTOs;

public record LoginResponseDto(
    Guid Id,
    string Email,
    string Name,
    string? ProfilePictureUrl,
    string Token
);
