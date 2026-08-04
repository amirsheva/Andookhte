using System.Net;
using System.Net.Mail;
using Andookhte.Application.Common.Interfaces;
using Andookhte.Domain.Entities.Identity;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Andookhte.Infrastructure.Security;

/// <summary>
/// ارسال کد یک‌بارمصرف از طریق SMTP — برای گیرندهٔ ایمیلی.
///
/// <see cref="ExposesCodeInResponse"/> همیشه false است — کد هرگز در پاسخ API برنمی‌گردد.
/// گیرندهٔ غیرایمیلی پشتیبانی نمی‌شود؛ آن مسیر به <see cref="KavenegarOtpSender"/> می‌رود.
/// </summary>
public class SmtpOtpSender : IOtpSender
{
    private readonly SmtpOptions _options;
    private readonly ILogger<SmtpOtpSender> _logger;

    public SmtpOtpSender(IOptions<SmtpOptions> options, ILogger<SmtpOtpSender> logger)
    {
        _options = options.Value;
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

        var port = int.TryParse(_options.Port, out var parsed) ? parsed : 587;

        using var client = new SmtpClient(_options.Host, port)
        {
            EnableSsl = true,
            Credentials = new NetworkCredential(_options.Username, _options.Password),
        };

        using var message = new MailMessage
        {
            From = new MailAddress(_options.FromAddress, _options.FromName),
            Subject = BuildSubject(purpose),
            Body = BuildBody(code, purpose),
        };
        message.To.Add(receiver);

        try
        {
            await client.SendMailAsync(message, cancellationToken);
        }
        catch (Exception exception) when (exception is SmtpException or InvalidOperationException)
        {
            // خطای شبکه یا پیکربندی نباید جریان بازیابی رمز را با استثنای مبهم بترکاند؛
            // کاربر پیام «کد ارسال شد» را می‌بیند و در صورت نرسیدن، دوباره درخواست می‌دهد.
            _logger.LogError(exception, "ارسال ایمیل به {Receiver} ناموفق بود.", receiver);
        }
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
