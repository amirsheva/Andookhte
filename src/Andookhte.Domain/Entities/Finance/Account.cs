using Andookhte.Domain.Common;

namespace Andookhte.Domain.Entities.Finance;

public enum AccountType
{
    Bank = 1,
    Cash = 2,
    /// <summary>قبلاً «طلا و ارز» ترکیبی بود؛ ارز به نوع جدای <see cref="Currency"/> منتقل شد.</summary>
    Gold = 3,
    Crypto = 4,
    SavingsFund = 5,
    Currency = 6
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

    /// <summary>توضیح آزاد — مثلاً «در صندوق فلان» یا هر یادداشت دیگر. برای همهٔ انواع در دسترس است.</summary>
    public string? Note { get; set; }

    /* ————— طلا ————— */
    public decimal? GoldWeightGrams { get; set; }
    /// <summary>عیار — مثلاً ۱۸، ۲۱، ۲۲، ۲۴.</summary>
    public int? GoldPurity { get; set; }
    /// <summary>نوع کالا — طلای خام، سکه، انگشتر، گردنبند، ...</summary>
    public string? GoldItemType { get; set; }

    /* ————— رمزارز ————— */
    /// <summary>نماد — BTC، ETH، USDT، ...</summary>
    public string? CryptoSymbol { get; set; }

    /// <summary>
    /// نرخ تبدیل هر واحد (۱ دلار، ۱ بیت‌کوین، ...) به ریال — فعلاً دستی وارد می‌شود.
    /// فقط برای Currency و Crypto معنا دارد.
    /// </summary>
    public decimal? ManualRateIrr { get; set; }

    public ICollection<Transaction> Transactions { get; set; } = new List<Transaction>();
}
