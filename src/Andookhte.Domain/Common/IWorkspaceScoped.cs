namespace Andookhte.Domain.Common;

/// <summary>
/// هر انتیتی که به یک فضای کاری تعلق دارد این قرارداد را پیاده می‌کند.
/// فیلتر سراسری کوئری در AppDbContext روی همین قرارداد اعمال می‌شود،
/// بنابراین امکان فراموش‌کردن محدودسازی داده در یک هندلر وجود ندارد.
/// </summary>
public interface IWorkspaceScoped
{
    Guid WorkspaceId { get; set; }
}
