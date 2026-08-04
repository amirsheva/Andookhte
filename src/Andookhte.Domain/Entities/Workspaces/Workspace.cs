using Andookhte.Domain.Common;

namespace Andookhte.Domain.Entities.Workspaces;

public enum WorkspaceType
{
    /// <summary>حساب شخصی</summary>
    Personal = 1,
    /// <summary>کسب‌وکار یا فروشگاه</summary>
    Business = 2
}

/// <summary>
/// فضای کاری — واحد جداسازی داده. هر حساب، تراکنش، انبار و کالا دقیقاً به یک فضای کاری تعلق دارد.
/// </summary>
public class Workspace : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public WorkspaceType Type { get; set; } = WorkspaceType.Personal;

    public Guid OwnerUserId { get; set; }

    /// <summary>واحد پول پیش‌فرض این فضای کاری.</summary>
    public string CurrencyCode { get; set; } = "IRR";

    public ICollection<WorkspaceMember> Members { get; set; } = new List<WorkspaceMember>();
}
