namespace Andookhte.Application.Common.Interfaces;

/// <summary>هویت کاربر درخواست جاری — از روی Claimهای توکن پر می‌شود.</summary>
public interface ICurrentUser
{
    Guid? UserId { get; }
    bool IsAuthenticated { get; }
    string? IpAddress { get; }
    string? UserAgent { get; }

    /// <summary>شناسهٔ کاربر یا استثنا در صورت نبود احراز هویت.</summary>
    Guid RequireUserId();
}
