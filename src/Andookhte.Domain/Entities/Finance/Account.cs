using Andookhte.Domain.Common;

namespace Andookhte.Domain.Entities.Finance;

public enum AccountType
{
    Bank = 1,
    Cash = 2,
    GoldAndCurrency = 3,
    Crypto = 4,
    SavingsFund = 5
}

public class Account : BaseEntity, IWorkspaceScoped
{
    public Guid WorkspaceId { get; set; }

    /// <summary>کاربری که این حساب را ثبت کرده — فقط برای ردیابی، نه برای جداسازی داده.</summary>
    public Guid CreatedByUserId { get; set; }

    public string Title { get; set; } = string.Empty;
    public AccountType Type { get; set; }
    public decimal InitialBalance { get; set; }
    public decimal CurrentBalance { get; set; }
    public string CurrencyCode { get; set; } = "IRR";

    public string? CardNumber { get; set; }
    public string? IBAN { get; set; }
    public string? BankName { get; set; }

    public ICollection<Transaction> Transactions { get; set; } = new List<Transaction>();
}
