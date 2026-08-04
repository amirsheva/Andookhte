using Andookhte.Domain.Entities.Workspaces;

namespace Andookhte.Application.Features.Auth;

public record UserDto(
    Guid Id,
    string DisplayName,
    string? Email,
    string? PhoneNumber,
    bool IsEmailConfirmed,
    bool IsPhoneConfirmed
);

public record WorkspaceSummaryDto(
    Guid Id,
    string Name,
    WorkspaceType Type,
    string CurrencyCode,
    WorkspaceRole Role,
    bool IsOwner
);

/// <summary>پاسخ مشترک همهٔ مسیرهای ورود: ثبت‌نام، رمز عبور، کد یک‌بارمصرف و تمدید توکن.</summary>
public record AuthResultDto(
    string AccessToken,
    int ExpiresInSeconds,
    string RefreshToken,
    UserDto User,
    IReadOnlyList<WorkspaceSummaryDto> Workspaces,
    Guid ActiveWorkspaceId
);

/// <summary>
/// نتیجهٔ درخواست کد یک‌بارمصرف.
/// <c>DevelopmentCode</c> فقط در محیط توسعه پر می‌شود تا تست بدون پنل پیامک ممکن باشد.
/// </summary>
public record RequestOtpResultDto(
    string Receiver,
    int ExpiresInSeconds,
    string? DevelopmentCode
);
