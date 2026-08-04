using Andookhte.Domain.Entities.Workspaces;

namespace Andookhte.Application.Common.Interfaces;

/// <summary>
/// فضای کاری فعال درخواست جاری. از هدر X-Workspace-Id خوانده می‌شود
/// و همیشه در برابر عضویت کاربر اعتبارسنجی می‌گردد.
/// </summary>
public interface IWorkspaceContext
{
    Guid? WorkspaceId { get; }
    WorkspaceRole? Role { get; }
    bool IsResolved { get; }

    /// <summary>شناسهٔ فضای کاری فعال یا استثنا در صورت نبود آن.</summary>
    Guid RequireWorkspaceId();

    /// <summary>در صورتی که نقش کاربر کمتر از حد لازم باشد، استثنای دسترسی پرتاب می‌کند.</summary>
    void RequireRole(WorkspaceRole minimumRole);
}
