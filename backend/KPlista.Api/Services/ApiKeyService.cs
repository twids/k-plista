using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using KPlista.Api.Data;
using KPlista.Api.Models;

namespace KPlista.Api.Services;

public interface IApiKeyService
{
    string GenerateApiKey();
    string HashApiKey(string apiKey);
    Task<ApiKey?> ValidateApiKeyAsync(string apiKey);
}

public class ApiKeyService : IApiKeyService
{
    private readonly KPlistaDbContext _context;

    public ApiKeyService(KPlistaDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Generates a cryptographically secure API key using 256 bits of random data.
    /// The key is encoded as unpadded URL-safe base64 (base64url) for safe use in HTTP headers.
    /// </summary>
    /// <returns>A URL-safe base64 encoded string suitable for use as an API key.</returns>
    public string GenerateApiKey()
    {
        // Generate a cryptographically secure random API key
        var bytes = new byte[32];
        RandomNumberGenerator.Fill(bytes);
        // Encode as unpadded URL-safe base64 (base64url) for safe use in HTTP headers
        return Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');
    }

    public string HashApiKey(string apiKey)
    {
        // Hash the API key using SHA256 for storage
        using var sha256 = SHA256.Create();
        var hashBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(apiKey));
        return Convert.ToBase64String(hashBytes);
    }

    public async Task<ApiKey?> ValidateApiKeyAsync(string apiKey)
    {
        var hash = HashApiKey(apiKey);
        var apiKeyEntity = await _context.ApiKeys
            .Include(ak => ak.User)
            .FirstOrDefaultAsync(ak => ak.KeyHash == hash);

        if (apiKeyEntity != null)
        {
            // Update last used timestamp
            apiKeyEntity.LastUsedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }

        return apiKeyEntity;
    }
}
