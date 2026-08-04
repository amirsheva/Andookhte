using Andookhte.Domain.Common;
using Andookhte.Domain.Entities.Identity;

namespace Andookhte.Domain.Entities.Workspaces;

/// <summary>
/// نقش‌ها به‌صورت صعودی تعریف شده‌اند تا مقایسهٔ سطح دسترسی ساده باشد.
/// </summary>
public enum WorkspaceRole
{
    /// <summary>فقط مشاهده</summary>
    Viewer = 1,
    /// <summary>حسابدار — ثبت و ویرایش تراکنش و حساب</summary>
    Accountant = 2,
    /// <summary>مدیر — همهٔ دسترسی‌ها به‌جز حذف فضای کاری</summary>
    Admin = 3,
    /// <summary>مالک — همهٔ دسترسی‌ها</summary>
    Owner = 4
}

public class WorkspaceMember : BaseEntity
{
    public Guid WorkspaceId { get; set; }
    public Workspace Workspace { get; set; } = null!;

    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public WorkspaceRole Role { get; set; } = WorkspaceRole.Viewer;

    public DateTime JoinedAtUtc { get; set; } = DateTime.UtcNow;
}
