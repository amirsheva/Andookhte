using Andookhte.Domain.Entities.Identity;

namespace Andookhte.Application.Common.Interfaces;

public interface IOtpSender
{
    /// <summary>
    /// ارسال کد یک‌بارمصرف. پیاده‌سازی توسعه فقط در لاگ می‌نویسد؛
    /// برای تولید باید به پنل پیامک متصل شود.
    /// </summary>
    Task SendAsync(string receiver, string code, OtpPurpose purpose, CancellationToken cancellationToken = default);

    /// <summary>در محیط توسعه true است تا کد در پاسخ API هم برگردد و تست بدون پنل پیامک ممکن باشد.</summary>
    bool ExposesCodeInResponse { get; }
}
