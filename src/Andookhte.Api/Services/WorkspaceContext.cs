using Andookhte.Application.Common.Exceptions;
using Andookhte.Application.Common.Interfaces;
using Andookhte.Domain.Entities.Workspaces;

namespace Andookhte.Api.Services;

/// <summary>
/// فضای کاری فعال درخواست جاری. مقدار آن را میان‌افزار
/// <see cref="Middleware.WorkspaceResolutionMiddleware"/> پس از اعتبارسنجی عضویت پر می‌کند.
/// چون نقش در هر درخواست از دیتابیس خوانده می‌شود، تغییر سطح دسترسی بلافاصله اثر می‌کند
/// و نیازی به صدور توکن جدید نیست.
/// </summary>
public class WorkspaceContext : IWorkspaceContext
{
    public Guid? WorkspaceId { get; private set; }
    public WorkspaceRole? Role { get; private set; }
    public bool IsResolved => WorkspaceId is not null;

    internal void Set(Guid workspaceId, WorkspaceRole role)
    {
        WorkspaceId = workspaceId;
        Role = role;
    }

    public Guid RequireWorkspaceId()
        => WorkspaceId ?? throw new ForbiddenException(
            "فضای کاری فعال مشخص نیست. هدر X-Workspace-Id را ارسال کنید.");

    public void RequireRole(WorkspaceRole minimumRole)
    {
        var role = Role ?? throw new ForbiddenException(
            "فضای کاری فعال مشخص نیست. هدر X-Workspace-Id را ارسال کنید.");

        if (role < minimumRole)
            throw new ForbiddenException($"این عملیات دست‌کم نقش «{Describe(minimumRole)}» می‌خواهد.");
    }

    private static string Describe(WorkspaceRole role) => role switch
    {
        WorkspaceRole.Viewer => "بیننده",
        WorkspaceRole.Accountant => "حسابدار",
        WorkspaceRole.Admin => "مدیر",
        WorkspaceRole.Owner => "مالک",
        _ => role.ToString()
    };
}
