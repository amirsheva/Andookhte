namespace Andookhte.Application.Features.ApiKeys;

public record ApiKeyDto(
    Guid Id,
    string Label,
    string LastFour,
    DateTime CreatedAtUtc,
    DateTime? LastUsedAtUtc,
    bool IsRevoked
);

/// <summary>کلید خام فقط همین یک‌بار، در پاسخ ساخت، برگردانده می‌شود — بعد از آن فقط هش آن باقی می‌ماند.</summary>
public record CreateApiKeyResult(Guid Id, string Label, string RawKey, DateTime CreatedAtUtc);
