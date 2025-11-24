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
}
