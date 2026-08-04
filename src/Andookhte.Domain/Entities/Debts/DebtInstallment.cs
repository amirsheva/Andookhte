using Andookhte.Domain.Common;
using Andookhte.Domain.Entities.Finance;

namespace Andookhte.Domain.Entities.Debts;

public enum InstallmentStatus
{
    Pending = 1,
    Paid = 2
}

public class DebtInstallment : BaseEntity, IWorkspaceScoped
{
    /// <summary>
    /// از Debt قابل استنتاج است، ولی مستقیم نگهداری می‌شود تا فیلتر سراسری کوئری
    /// روی همهٔ انتیتی‌ها بدون join یکنواخت اعمال شود (همان قرارداد بقیهٔ انتیتی‌ها).
    /// </summary>
    public Guid WorkspaceId { get; set; }

    public Guid DebtId { get; set; }
    public Debt Debt { get; set; } = null!;

    /// <summary>شمارهٔ قسط برای نمایش («قسط ۳ از ۱۲»)؛ برای بدهی یک‌باره همیشه ۱.</summary>
    public int SequenceNumber { get; set; }

    public DateTime DueDateUtc { get; set; }

    /// <summary>
    /// مبلغ هر قسط مستقل و قابل ویرایش است — نه فقط حاصل تقسیم مبلغ کل — چون
    /// وام‌های با سود متغیر ماه‌به‌ماه مبلغ متفاوت دارند.
    /// </summary>
    public decimal Amount { get; set; }

    public InstallmentStatus Status { get; set; } = InstallmentStatus.Pending;
    public DateTime? PaidAtUtc { get; set; }

    /// <summary>تراکنش مالی‌ای که با ثبت پرداخت این قسط ساخته شد.</summary>
    public Guid? PaidTransactionId { get; set; }
    public Transaction? PaidTransaction { get; set; }

    /// <summary>برای جلوگیری از ارسال دوبارهٔ ایمیل یادآوری سررسید.</summary>
    public DateTime? ReminderSentAtUtc { get; set; }
}
