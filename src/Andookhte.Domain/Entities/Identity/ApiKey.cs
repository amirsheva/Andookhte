using Andookhte.Domain.Common;

namespace Andookhte.Domain.Entities.Identity;

/// <summary>
/// کلید دسترسی شخصی — برای اتوماسیون‌هایی مثل شورتکات آیفون که نمی‌توانند
/// جریان ورود معمولی را طی کنند. برخلاف توکن دسترسی JWT کوتاه‌عمر، این کلید
/// تا وقتی خودِ کاربر باطلش نکند معتبر می‌ماند — پس فقط هشِ آن نگهداری می‌شود،
/// درست مثل <see cref="RefreshToken"/>.
/// </summary>
public class ApiKey : BaseEntity
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    /// <summary>فضای کاری‌ای که این کلید به آن محدود است — هر درخواست با این کلید همیشه همان‌جا می‌نویسد.</summary>
    public Guid WorkspaceId { get; set; }

    public string Label { get; set; } = string.Empty;
    public string KeyHash { get; set; } = string.Empty;

    /// <summary>چهار نویسهٔ آخر کلید — برای شناسایی در فهرست، بدون نگهداری کل کلید.</summary>
    public string LastFour { get; set; } = string.Empty;

    public DateTime? LastUsedAtUtc { get; set; }
    public DateTime? RevokedAtUtc { get; set; }
}
