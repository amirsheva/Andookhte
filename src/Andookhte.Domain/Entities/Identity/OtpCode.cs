using Andookhte.Domain.Common;

namespace Andookhte.Domain.Entities.Identity;

public enum OtpPurpose
{
    Login = 1,
    PhoneConfirmation = 2,
    PasswordReset = 3,
    EmailConfirmation = 4
}

/// <summary>
/// کد یک‌بارمصرف. مانند توکن تمدید، فقط هش کد ذخیره می‌شود.
/// </summary>
public class OtpCode : BaseEntity
{
    /// <summary>گیرنده: شمارهٔ موبایل یا ایمیل نرمال‌شده.</summary>
    public string Receiver { get; set; } = string.Empty;

    public OtpPurpose Purpose { get; set; } = OtpPurpose.Login;

    public string CodeHash { get; set; } = string.Empty;

    public DateTime ExpiresAtUtc { get; set; }
    public DateTime? ConsumedAtUtc { get; set; }

    /// <summary>تعداد تلاش ناموفق برای جلوگیری از حملهٔ جست‌وجوی فراگیر.</summary>
    public int AttemptCount { get; set; }

    public bool IsUsable => ConsumedAtUtc is null && AttemptCount < 5 && DateTime.UtcNow < ExpiresAtUtc;
}
