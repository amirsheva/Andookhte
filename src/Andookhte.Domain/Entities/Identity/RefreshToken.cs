using Andookhte.Domain.Common;

namespace Andookhte.Domain.Entities.Identity;

/// <summary>
/// توکن تمدید. خودِ توکن هرگز ذخیره نمی‌شود؛ فقط هش SHA-256 آن نگهداری می‌گردد
/// تا در صورت افشای دیتابیس، توکن‌ها قابل استفادهٔ مجدد نباشند.
/// </summary>
public class RefreshToken : BaseEntity
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public string TokenHash { get; set; } = string.Empty;

    public DateTime ExpiresAtUtc { get; set; }
    public DateTime? RevokedAtUtc { get; set; }

    /// <summary>هش توکن جایگزین — برای تشخیص استفادهٔ مجدد از توکن باطل‌شده.</summary>
    public string? ReplacedByTokenHash { get; set; }

    public string? CreatedByIp { get; set; }
    public string? UserAgent { get; set; }

    public bool IsActive => RevokedAtUtc is null && DateTime.UtcNow < ExpiresAtUtc;
}
