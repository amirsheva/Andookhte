using Andookhte.Domain.Entities.Identity;

namespace Andookhte.Application.Common.Interfaces;

public record AccessToken(string Value, DateTime ExpiresAtUtc, int ExpiresInSeconds);

public interface ITokenService
{
    /// <summary>
    /// توکن دسترسی فقط هویت کاربر را حمل می‌کند، نه فضای کاری.
    /// فضای کاری فعال در هر درخواست از هدر خوانده و در برابر عضویت بررسی می‌شود،
    /// بنابراین تغییر نقش کاربر بلافاصله اثر می‌کند و نیازی به صدور توکن جدید نیست.
    /// </summary>
    AccessToken CreateAccessToken(User user);

    /// <summary>توکن تمدید تصادفی و امن تولید می‌کند (مقدار خام، فقط یک بار قابل مشاهده).</summary>
    string GenerateRefreshToken();

    /// <summary>هش SHA-256 با کدگذاری Base64 — برای ذخیرهٔ توکن و کد یک‌بارمصرف.</summary>
    string HashToken(string token);

    /// <summary>مدت اعتبار توکن تمدید.</summary>
    TimeSpan RefreshTokenLifetime { get; }
}
