using Andookhte.Domain.Common;
using Andookhte.Domain.Entities.Workspaces;

namespace Andookhte.Domain.Entities.Identity;

public class User : BaseEntity
{
    /// <summary>ایمیل نرمال‌شده (حروف کوچک). برای ورود با رمز عبور.</summary>
    public string? Email { get; set; }

    /// <summary>شمارهٔ موبایل نرمال‌شده با قالب 09xxxxxxxxx. برای ورود با کد یک‌بارمصرف.</summary>
    public string? PhoneNumber { get; set; }

    /// <summary>هش PBKDF2 به همراه نمک و تعداد تکرار. برای کاربرانی که فقط با OTP وارد می‌شوند خالی است.</summary>
    public string? PasswordHash { get; set; }

    public string DisplayName { get; set; } = string.Empty;

    public bool IsEmailConfirmed { get; set; }
    public bool IsPhoneConfirmed { get; set; }
    public bool IsActive { get; set; } = true;

    public DateTime? LastLoginAtUtc { get; set; }

    /// <summary>شمارندهٔ ورود ناموفق برای قفل موقت حساب.</summary>
    public int FailedLoginAttempts { get; set; }
    public DateTime? LockoutEndsAtUtc { get; set; }

    public ICollection<WorkspaceMember> Memberships { get; set; } = new List<WorkspaceMember>();
    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
}
