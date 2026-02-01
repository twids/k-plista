using Hangfire.Dashboard;

namespace KPlista.Api.Services;

/// <summary>
/// Authorization filter for Hangfire Dashboard.
/// Note: The dashboard is only registered in development mode (see Program.cs),
/// so this filter only applies to development environments.
/// Allows local/localhost requests only.
/// </summary>
public class HangfireAuthorizationFilter : IDashboardAuthorizationFilter
{
    public bool Authorize(DashboardContext context)
    {
        var httpContext = context.GetHttpContext();
        
        // Allow all requests in development (local only)
        // In production, implement proper authentication
        return httpContext.Request.IsLocal() || 
               httpContext.Connection.RemoteIpAddress?.ToString() == "127.0.0.1" ||
               httpContext.Connection.RemoteIpAddress?.ToString() == "::1";
    }
}

/// <summary>
/// Extension method to check if request is local
/// </summary>
public static class HttpRequestExtensions
{
    public static bool IsLocal(this HttpRequest request)
    {
        var connection = request.HttpContext.Connection;
        if (connection.RemoteIpAddress != null)
        {
            return connection.LocalIpAddress != null
                ? connection.RemoteIpAddress.Equals(connection.LocalIpAddress)
                : System.Net.IPAddress.IsLoopback(connection.RemoteIpAddress);
        }

        // for in-memory requests (during testing)
        if (connection.RemoteIpAddress == null && connection.LocalIpAddress == null)
        {
            return true;
        }

        return false;
    }
}
