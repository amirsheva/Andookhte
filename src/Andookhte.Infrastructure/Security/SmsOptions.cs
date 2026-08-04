namespace Andookhte.Infrastructure.Security;

public class SmsOptions
{
    public const string SectionName = "Sms";

    /// <summary>کلید API پنل پیامک. تا وقتی خالی باشد، کد فقط در لاگ نوشته می‌شود.</summary>
    public string ApiKey { get; set; } = string.Empty;

    /// <summary>
    /// نام الگوی تأییدشده در پنل (سرویس lookup کاوه‌نگار).
    /// ارسال با الگو برای پیامک احراز هویت الزامی است و بدون آن پنل پیام را رد می‌کند.
    /// </summary>
    public string Template { get; set; } = string.Empty;

    /// <summary>شمارهٔ فرستنده — فقط برای ارسال بدون الگو استفاده می‌شود.</summary>
    public string Sender { get; set; } = string.Empty;

    public bool IsConfigured => !string.IsNullOrWhiteSpace(ApiKey);
}
