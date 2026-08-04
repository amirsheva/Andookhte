using Andookhte.Application.Common.Interfaces;
using Andookhte.Domain.Entities.Identity;
using Microsoft.Extensions.Logging;

namespace Andookhte.Infrastructure.Security;

/// <summary>
/// ارسال کد یک‌بارمصرف از طریق SMTP — برای گیرندهٔ ایمیلی.
///
/// <see cref="ExposesCodeInResponse"/> همیشه false است — کد هرگز در پاسخ API برنمی‌گردد.
/// گیرندهٔ غیرایمیلی پشتیبانی نمی‌شود؛ آن مسیر به <see cref="KavenegarOtpSender"/> می‌رود.
/// اتصال خام SMTP در <see cref="SmtpEmailSender"/> است تا با یادآوری سررسید بدهی مشترک بماند.
/// </summary>
public class SmtpOtpSender : IOtpSender
{
    private readonly IEmailSender _emailSender;
    private readonly ILogger<SmtpOtpSender> _logger;

    public SmtpOtpSender(IEmailSender emailSender, ILogger<SmtpOtpSender> logger)
    {
        _emailSender = emailSender;
        _logger = logger;
    }

    public bool ExposesCodeInResponse => false;

    public async Task SendAsync(
        string receiver, string code, OtpPurpose purpose, CancellationToken cancellationToken = default)
    {
        if (!receiver.Contains('@'))
        {
            _logger.LogWarning(
                "ارسال ایمیل به گیرندهٔ غیرایمیلی {Receiver} انجام نشد.", receiver);
            return;
        }

        await _emailSender.SendAsync(receiver, BuildSubject(purpose), BuildBody(code, purpose), cancellationToken);
    }

    private static string BuildSubject(OtpPurpose purpose) => purpose switch
    {
        OtpPurpose.PasswordReset => "بازیابی رمز عبور — اندوخته",
        OtpPurpose.EmailConfirmation => "تأیید ایمیل — اندوخته",
        _ => "کد تأیید — اندوخته",
    };

    private static string BuildBody(string code, OtpPurpose purpose)
    {
        var action = purpose switch
        {
            OtpPurpose.PasswordReset => "بازیابی رمز عبور",
            OtpPurpose.EmailConfirmation => "تأیید ایمیل",
            _ => "ورود",
        };

        return $"کد {action} شما در اندوخته: {code}\n\n" +
               "این کد تا ۲ دقیقه معتبر است. اگر این درخواست را شما نداده‌اید، نادیده بگیرید.";
    }
}
