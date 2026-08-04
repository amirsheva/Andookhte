using Andookhte.Application.Common.Interfaces;
using Andookhte.Domain.Entities.Identity;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Andookhte.Infrastructure.Security;

/// <summary>
/// فرستندهٔ کد یک‌بارمصرف برای محیط توسعه — کد را فقط در لاگ می‌نویسد.
/// برای تولید باید پیاده‌سازی متصل به پنل پیامک (کاوه‌نگار، قاصدک، …) جایگزین شود
/// و <see cref="ExposesCodeInResponse"/> حتماً false بماند.
/// </summary>
public class LoggingOtpSender : IOtpSender
{
    private readonly ILogger<LoggingOtpSender> _logger;
    private readonly IHostEnvironment _environment;

    public LoggingOtpSender(ILogger<LoggingOtpSender> logger, IHostEnvironment environment)
    {
        _logger = logger;
        _environment = environment;
    }

    /// <summary>برگرداندن کد در پاسخ فقط در محیط توسعه مجاز است.</summary>
    public bool ExposesCodeInResponse => _environment.IsDevelopment();

    public Task SendAsync(string receiver, string code, OtpPurpose purpose, CancellationToken cancellationToken = default)
    {
        _logger.LogWarning(
            "کد یک‌بارمصرف برای {Receiver} با هدف {Purpose}: {Code} — این پیاده‌سازی فقط برای توسعه است.",
            receiver, purpose, code);

        return Task.CompletedTask;
    }
}
