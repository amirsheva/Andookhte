using Andookhte.Domain.Common;

namespace Andookhte.Domain.Entities.Debts;

public enum DebtDirection
{
    /// <summary>بدهی من — باید بپردازم</summary>
    Payable = 1,
    /// <summary>طلب من — باید به من برگردانده شود</summary>
    Receivable = 2
}

/// <summary>
/// هر سه حالت فقط در نحوهٔ تولید قسط‌های اولیه فرق دارند؛ بعد از ساخت، هرسه
/// یک لیست از <see cref="DebtInstallment"/> مستقل و قابل‌ویرایش‌اند.
/// </summary>
public enum DebtRecurrenceType
{
    /// <summary>یک‌باره با یک سررسید — مثل قرض‌دادن به یک نفر</summary>
    OneTime = 1,
    /// <summary>اقساط ثابت با تعداد معین — مثل وام بانکی یا قرض‌الحسنه</summary>
    Installment = 2,
    /// <summary>تکرار ماهیانه با پایان باز — مثل شارژ ساختمان</summary>
    Monthly = 3
}

public class Debt : BaseEntity, IWorkspaceScoped
{
    public Guid WorkspaceId { get; set; }

    /// <summary>کاربری که این بدهی/طلب را ثبت کرده — یادآوری ایمیلی هم به همین کاربر می‌رود.</summary>
    public Guid CreatedByUserId { get; set; }

    public string Title { get; set; } = string.Empty;
    public DebtDirection Direction { get; set; }
    public DebtRecurrenceType RecurrenceType { get; set; }

    /// <summary>طرف حساب — نام آزاد، نه لزوماً کاربر ثبت‌شده در سامانه.</summary>
    public string? CounterpartyName { get; set; }

    public string? Note { get; set; }

    public ICollection<DebtInstallment> Installments { get; set; } = new List<DebtInstallment>();
}
