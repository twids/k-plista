using Serilog.Core;
using Serilog.Events;
using System.Text.RegularExpressions;

namespace KPlista.Api.Services;

/// <summary>
/// Serilog enricher that automatically masks sensitive data (emails, external IDs) in log output.
/// This enricher processes all logged properties and masks sensitive patterns.
/// </summary>
public class SensitiveDataEnricher : ILogEventEnricher
{
    // Email pattern: matches standard email addresses
    private static readonly Regex EmailPattern = new(@"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", RegexOptions.Compiled);

    public void Enrich(LogEvent logEvent, ILogEventPropertyFactory propertyFactory)
    {
        // Process all properties
        var propertiesToRemove = new List<string>();
        var propertiesToAdd = new Dictionary<string, LogEventPropertyValue>();

        foreach (var property in logEvent.Properties)
        {
            var maskedValue = MaskPropertyValue(property.Value);
            if (!ReferenceEquals(maskedValue, property.Value))
            {
                propertiesToRemove.Add(property.Key);
                propertiesToAdd[property.Key] = maskedValue;
            }
        }

        // Remove old and add masked properties
        foreach (var key in propertiesToRemove)
        {
            logEvent.RemovePropertyIfPresent(key);
        }

        foreach (var kvp in propertiesToAdd)
        {
            logEvent.AddPropertyIfAbsent(propertyFactory.CreateProperty(kvp.Key, kvp.Value));
        }
    }

    private static LogEventPropertyValue MaskPropertyValue(LogEventPropertyValue value)
    {
        if (value is ScalarValue scalarValue && scalarValue.Value is string stringValue)
        {
            var maskedValue = MaskSensitiveData(stringValue);
            if (maskedValue != stringValue)
            {
                return new ScalarValue(maskedValue);
            }
        }
        else if (value is StructureValue structValue)
        {
            var maskedProperties = new List<LogEventProperty>();
            var hasChanges = false;

            foreach (var prop in structValue.Properties)
            {
                var maskedPropValue = MaskPropertyValue(prop.Value);
                if (!ReferenceEquals(maskedPropValue, prop.Value))
                {
                    hasChanges = true;
                    maskedProperties.Add(new LogEventProperty(prop.Name, maskedPropValue));
                }
                else
                {
                    maskedProperties.Add(prop);
                }
            }

            if (hasChanges)
            {
                return new StructureValue(maskedProperties, structValue.TypeTag);
            }
        }

        return value;
    }

    private static string MaskSensitiveData(string text)
    {
        if (string.IsNullOrEmpty(text)) return text;

        // Mask email addresses
        text = EmailPattern.Replace(text, MaskEmail);

        return text;
    }

    private static string MaskEmail(Match match)
    {
        var email = match.Value;
        var atIndex = email.IndexOf('@');
        if (atIndex <= 0) return "***";

        var local = email.Substring(0, atIndex);
        var domain = email.Substring(atIndex + 1);

        // Mask local part: keep first char, mask the rest
        var maskedLocal = local.Length <= 1 ? local[0] + "***" : local[0] + new string('*', Math.Min(local.Length - 1, 6));

        // Keep domain as-is or partially mask if very long
        var domainParts = domain.Split('.');
        if (domainParts.Length > 1 && domainParts[0].Length > 6)
        {
            domainParts[0] = domainParts[0].Substring(0, 3) + "***";
            domain = string.Join('.', domainParts);
        }

        return maskedLocal + "@" + domain;
    }
}
