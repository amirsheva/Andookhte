using Andookhte.Domain.Common;

namespace Andookhte.Domain.Entities.Finance;

public class Transaction : BaseEntity, IWorkspaceScoped
{
    public Guid WorkspaceId { get; set; }

    /// <summary>کاربری که تراکنش را ثبت کرده — فقط برای ردیابی.</summary>
    public Guid CreatedByUserId { get; set; }

    public TransactionType Type { get; set; }
    public decimal Amount { get; set; }

    public Guid? SourceAccountId { get; set; }
    public Account? SourceAccount { get; set; }

    public Guid? DestinationAccountId { get; set; }
    public Account? DestinationAccount { get; set; }

    public string? Category { get; set; }
    public string? Description { get; set; }

    /// <summary>تاریخ وقوع تراکنش؛ ممکن است با تاریخ ثبت متفاوت باشد.</summary>
    public DateTime OccurredAtUtc { get; set; } = DateTime.UtcNow;
}
