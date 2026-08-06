using Andookhte.Domain.Entities.Workspaces;

namespace Andookhte.Application.Features.Workspaces;

/// <summary>
/// نام فیلد نقش عمداً «Role» است — همان چیزی که <c>WorkspaceSummaryDto</c> (پاسخ /Auth/me
/// و ورود) هم دارد. قبلاً «MyRole» بود و چون فرانت‌اند هر دو را با یک تایپ می‌خواند،
/// نقش بعد از رفرش از این مسیر (مثلاً پس از ساخت یا تغییر نام فضای کاری) گم می‌شد.
/// </summary>
public record WorkspaceDto(
    Guid Id,
    string Name,
    WorkspaceType Type,
    string CurrencyCode,
    WorkspaceRole Role,
    bool IsOwner,
    int MemberCount
);

public record WorkspaceMemberDto(
    Guid Id,
    Guid UserId,
    string DisplayName,
    string? Email,
    string? PhoneNumber,
    WorkspaceRole Role,
    bool IsOwner,
    DateTime JoinedAtUtc
);
