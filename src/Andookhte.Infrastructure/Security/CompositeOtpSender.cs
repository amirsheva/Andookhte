using Andookhte.Application.Common.Interfaces;
using Andookhte.Domain.Entities.Identity;

namespace Andookhte.Infrastructure.Security;

/// <summary>
/// گیرندهٔ ایمیلی و شماره‌ای دو کانال جدا نیاز دارند، ولی OtpService فقط یک
/// <see cref="IOtpSender"/> می‌شناسد. این کلاس بر اساس فرمت گیرنده مسیر می‌دهد
/// و کدام کانال آخرین بار استفاده شده را نگه می‌دارد تا <see cref="ExposesCodeInResponse"/>
/// درست همان کانال را منعکس کند. باید Scoped ثبت شود؛ در غیر این صورت این وضعیت
/// بین درخواست‌های هم‌زمان به اشتراک گذاشته می‌شود.
/// </summary>
public class CompositeOtpSender : IOtpSender
{
    private readonly IOtpSender _smsSender;
    private readonly IOtpSender _emailSender;
    private IOtpSender? _lastUsed;

    public CompositeOtpSender(IOtpSender smsSender, IOtpSender emailSender)
    {
        _smsSender = smsSender;
        _emailSender = emailSender;
    }

    public bool ExposesCodeInResponse => _lastUsed?.ExposesCodeInResponse ?? false;

    public Task SendAsync(
        string receiver, string code, OtpPurpose purpose, CancellationToken cancellationToken = default)
    {
        _lastUsed = receiver.Contains('@') ? _emailSender : _smsSender;
        return _lastUsed.SendAsync(receiver, code, purpose, cancellationToken);
    }
}
