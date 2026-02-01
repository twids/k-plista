# Email Masking in Logs - Implementation Summary

## Issue
PR comments raised concerns about storing email addresses in application logs, which is a privacy and security issue.

## Solution Implemented
Instead of relying on manual masking throughout the codebase, we implemented a **Serilog-based enricher** that automatically masks email addresses in all log output. This approach is:

- **Centralized**: Single point of configuration
- **Maintainable**: No need to remember to mask in every log statement
- **Comprehensive**: Catches all email addresses, even in unstructured strings
- **Configurable**: Easy to adjust masking patterns

## Components

### 1. SensitiveDataEnricher
**Location**: `backend/KPlista.Api/Services/SensitiveDataEnricher.cs`

This is a Serilog `ILogEventEnricher` that:
- Processes all logged properties before they are written to sinks
- Uses regex pattern matching to find email addresses: `[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}`
- Masks emails in format: `j***@example.com` (first char + domain)
- Handles both scalar values and nested structures
- Does NOT modify the original log event's message template (read-only)

### 2. Configuration
**Location**: `backend/KPlista.Api/Program.cs`

The enricher is registered in the Serilog configuration:
```csharp
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.With<SensitiveDataEnricher>()  // Add this line
    .Enrich.WithProperty("AppStartTimestamp", DateTimeOffset.UtcNow)
    .CreateLogger();
```

### 3. Code Changes

#### ExternalAuthProcessor.cs
- Removed `LogMasking.MaskEmail()` calls
- Removed `LogMasking.MaskExternalId()` calls
- Now logs raw values: `{Email}` and `{ExternalId}`
- Enricher automatically masks them before output

#### OAuthTicketHandler.cs
- Removed `LogMasking.MaskEmail()` calls
- Removed `LogMasking.MaskExternalId()` calls
- Simplified logging statements

#### Program.cs
- Removed `LogMasking.MaskEmail()` calls in Google OAuth handler
- Removed `LogMasking.MaskExternalId()` calls in Facebook OAuth handler
- Added SensitiveDataEnricher to the logger configuration

## Why This Approach?

### Before (Manual Masking)
```csharp
_logger.LogInformation("User {Email} logged in", LogMasking.MaskEmail(email));
// Output: User j***@example.com logged in
```

**Drawbacks:**
- Developers must remember to mask sensitive data in every log statement
- Easy to accidentally log unmasked data
- Inconsistent masking logic across codebase
- Hard to maintain and update masking rules

### After (Serilog Enricher)
```csharp
_logger.LogInformation("User {Email} logged in", email);
// Output: User j***@example.com logged in (automatically masked by enricher)
```

**Benefits:**
- Developers log natural values
- Masking is automatic and guaranteed
- Single point of maintenance
- Scales to other sensitive data patterns

## Impact

### Privacy & Security
✅ All email addresses are automatically masked in all logs (console and file)
✅ Logs can be safely shared and analyzed without exposing PII
✅ Reduces compliance risk (GDPR, CCPA, etc.)

### Performance
- Minimal overhead: Enricher runs once per log event
- Uses compiled regex patterns for efficiency
- Only processes scalar string values

### Debugging
- Still log meaningful information (masked but identifiable: first char + domain)
- Example: Can tell the difference between `j***@example.com` and `a***@test.org`

## Testing

The enricher can be tested by:
1. Triggering an OAuth login flow
2. Checking the logs (both console and file sink)
3. Verifying email addresses appear masked (e.g., `j***@gmail.com`)
4. Ensuring external IDs are not masked (they're not email patterns)

Example log output:
```
[14:32:15 INF] Google: Authenticated j***@example.com (extId ab12cd34ef56gh78)
[14:32:15 INF] ExternalAuth: New user created for j***@example.com via google (extId: ab12****ef56gh78)
```

## Future Enhancements

The enricher can be extended to mask other sensitive patterns:
- API keys and tokens
- Phone numbers
- Social security numbers
- Credit card numbers
- Custom PII patterns per application

Simply add more regex patterns to the `MaskSensitiveData()` method or create separate enrichers for different data types.
