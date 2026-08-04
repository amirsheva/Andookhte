using System.Net;
using Andookhte.Application.Common.Interfaces;
using Andookhte.Domain.Entities.Identity;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Andookhte.Infrastructure.Security;

/// <summary>
/// ارسال کد یک‌بارمصرف از طریق پنل کاوه‌نگار.
///
/// دو نکته که در تولید اهمیت دارند:
/// ۱. <see cref="ExposesCodeInResponse"/> همیشه false است — کد هرگز در پاسخ API برنمی‌گردد.
/// ۲. گیرندهٔ ایمیلی پشتیبانی نمی‌شود؛ برای آن به یک پیاده‌سازی SMTP جداگانه نیاز است.
/// </summary>
public class KavenegarOtpSender : IOtpSender
{
    private const string BaseAddress = "https://api.kavenegar.com";

    private readonly HttpClient _http;
    private readonly SmsOptions _options;
    private readonly ILogger<KavenegarOtpSender> _logger;

    public KavenegarOtpSender(
        HttpClient http, IOptions<SmsOptions> options, ILogger<KavenegarOtpSender> logger)
    {
        _http = http;
        _options = options.Value;
        _logger = logger;

        if (_http.BaseAddress is null)
            _http.BaseAddress = new Uri(BaseAddress);
    }

    public bool ExposesCodeInResponse => false;

    public async Task SendAsync(
        string receiver, string code, OtpPurpose purpose, CancellationToken cancellationToken = default)
    {
        // گیرندهٔ ایمیلی از این مسیر عبور نمی‌کند؛ بدون سرویس ایمیل، کد قابل تحویل نیست
        if (receiver.Contains('@'))
        {
            _logger.LogWarning(
                "ارسال کد به گیرندهٔ ایمیلی {Receiver} انجام نشد — سرویس ایمیل پیکربندی نشده است.",
                receiver);
            return;
        }

        var url = BuildUrl(receiver, code);

        try
        {
            using var response = await _http.GetAsync(url, cancellationToken);

            if (response.StatusCode != HttpStatusCode.OK)
            {
                var body = await response.Content.ReadAsStringAsync(cancellationToken);
                _logger.LogError(
                    "ارسال پیامک به {Receiver} ناموفق بود. کد وضعیت: {Status}. پاسخ: {Body}",
                    receiver, (int)response.StatusCode, body);
            }
        }
        catch (Exception exception) when (exception is HttpRequestException or TaskCanceledException)
        {
            // خطای شبکه نباید جریان ورود کاربر را با استثنای مبهم بترکاند؛
            // کاربر پیام «کد ارسال شد» را می‌بیند و در صورت نرسیدن، دوباره درخواست می‌دهد.
            _logger.LogError(exception, "ارتباط با پنل پیامک برای {Receiver} برقرار نشد.", receiver);
        }
    }

    private string BuildUrl(string receiver, string code)
    {
        var key = Uri.EscapeDataString(_options.ApiKey);
        var to = Uri.EscapeDataString(receiver);

        if (!string.IsNullOrWhiteSpace(_options.Template))
        {
            var template = Uri.EscapeDataString(_options.Template);
            return $"/v1/{key}/verify/lookup.json?receptor={to}&token={Uri.EscapeDataString(code)}&template={template}";
        }

        var message = Uri.EscapeDataString($"کد ورود اندوخته: {code}");
        var sender = Uri.EscapeDataString(_options.Sender);

        return $"/v1/{key}/sms/send.json?receptor={to}&sender={sender}&message={message}";
    }
}
