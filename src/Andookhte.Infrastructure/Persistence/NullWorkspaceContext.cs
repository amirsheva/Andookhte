using Andookhte.Application.Common.Interfaces;
using Andookhte.Domain.Entities.Workspaces;

namespace Andookhte.Infrastructure.Persistence;

/// <summary>
/// پیاده‌سازی خنثی برای زمان‌هایی که درخواست HTTP وجود ندارد:
/// ابزار مهاجرت EF، seed اولیه و تست‌ها. هیچ فضای کاری فعالی ندارد،
/// بنابراین فیلتر سراسری هیچ ردیفی برنمی‌گرداند.
/// </summary>
public sealed class NullWorkspaceContext : IWorkspaceContext
{
    public Guid? WorkspaceId => null;
    public WorkspaceRole? Role => null;
    public bool IsResolved => false;

    public Guid RequireWorkspaceId()
        => throw new InvalidOperationException("در این زمینه فضای کاری فعالی وجود ندارد.");

    public void RequireRole(WorkspaceRole minimumRole)
        => throw new InvalidOperationException("در این زمینه فضای کاری فعالی وجود ندارد.");
}
