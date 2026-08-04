using Andookhte.Application.Common.Interfaces;
using Microsoft.Extensions.Logging;

namespace Andookhte.Infrastructure.Security;

/// <summary>فرستندهٔ ایمیل برای وقتی SMTP پیکربندی نشده — فقط در لاگ می‌نویسد.</summary>
public class LoggingEmailSender : IEmailSender
{
    private readonly ILogger<LoggingEmailSender> _logger;

    public LoggingEmailSender(ILogger<LoggingEmailSender> logger)
    {
        _logger = logger;
    }

    public Task SendAsync(
        string toEmail, string subject, string body, CancellationToken cancellationToken = default)
    {
        _logger.LogWarning(
            "ایمیل به {Receiver} ارسال نشد (SMTP پیکربندی نشده). موضوع: {Subject}\n{Body}",
            toEmail, subject, body);

        return Task.CompletedTask;
    }
}
