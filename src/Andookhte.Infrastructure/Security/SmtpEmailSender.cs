using System.Net;
using System.Net.Mail;
using Andookhte.Application.Common.Interfaces;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Andookhte.Infrastructure.Security;

/// <summary>
/// فرستندهٔ خام SMTP — هم <see cref="SmtpOtpSender"/> (کد یک‌بارمصرف) و هم
/// سرویس یادآوری سررسید بدهی از همین یک پیاده‌سازی استفاده می‌کنند تا منطق
/// اتصال SMTP یک‌جا بماند.
/// </summary>
public class SmtpEmailSender : IEmailSender
{
    private readonly SmtpOptions _options;
    private readonly ILogger<SmtpEmailSender> _logger;

    public SmtpEmailSender(IOptions<SmtpOptions> options, ILogger<SmtpEmailSender> logger)
    {
        _options = options.Value;
        _logger = logger;
    }

    public async Task SendAsync(
        string toEmail, string subject, string body, CancellationToken cancellationToken = default)
    {
        var port = int.TryParse(_options.Port, out var parsed) ? parsed : 587;

        using var client = new SmtpClient(_options.Host, port)
        {
            EnableSsl = true,
            Credentials = new NetworkCredential(_options.Username, _options.Password),
        };

        using var message = new MailMessage
        {
            From = new MailAddress(_options.FromAddress, _options.FromName),
            Subject = subject,
            Body = body,
        };
        message.To.Add(toEmail);

        try
        {
            await client.SendMailAsync(message, cancellationToken);
        }
        catch (Exception exception) when (exception is SmtpException or InvalidOperationException)
        {
            // خطای شبکه یا پیکربندی نباید فراخوان را با استثنای مبهم بترکاند.
            _logger.LogError(exception, "ارسال ایمیل به {Receiver} ناموفق بود.", toEmail);
        }
    }
}
