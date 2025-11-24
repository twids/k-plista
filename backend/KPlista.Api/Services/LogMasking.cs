using System;

namespace KPlista.Api.Services;

public static class LogMasking
{
    public static string MaskEmail(string? email)
    {
        if (string.IsNullOrWhiteSpace(email)) return "(no email)";
        var atIndex = email.IndexOf('@');
        if (atIndex <= 0) return "***"; // malformed
        var local = email.Substring(0, atIndex);
        var domain = email.Substring(atIndex + 1);
        var maskedLocal = local.Length <= 1 ? local[0] + "***" : local[0] + new string('*', Math.Min(local.Length - 1, 6));
        // Keep domain, optionally partially mask first segment if very long
        var domainParts = domain.Split('.');
        if (domainParts.Length > 1 && domainParts[0].Length > 6)
        {
            domainParts[0] = domainParts[0].Substring(0, 3) + "***";
            domain = string.Join('.', domainParts);
        }
        return maskedLocal + "@" + domain;
    }

    public static string MaskExternalId(string? externalId)
    {
        if (string.IsNullOrWhiteSpace(externalId)) return "(no external id)";
        // Preserve first 4 chars and last 2 if long enough
        if (externalId.Length <= 6) return externalId[0] + "***" + externalId[^1];
        var prefix = externalId.Substring(0, 4);
        var suffix = externalId.Substring(externalId.Length - 2);
        return prefix + new string('*', externalId.Length - 6) + suffix;
    }
}
