namespace Andookhte.Infrastructure.Security;

public class SmtpOptions
{
    public const string SectionName = "Smtp";

    public string Host { get; set; } = string.Empty;

    /// <summary>
    /// عمداً رشته است نه int. اگر متغیر محیطی SMTP__PORT خالی باشد (یعنی SMTP
    /// پیکربندی نشده)، اتصال‌دهندهٔ پیکربندی نمی‌تواند رشتهٔ خالی را به int وصل
    /// کند و برنامه از استارت‌آپ سقوط می‌کند — حتی وقتی این کانال اصلاً استفاده نمی‌شود.
    /// </summary>
    public string Port { get; set; } = "587";

    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string FromAddress { get; set; } = string.Empty;
    public string FromName { get; set; } = "اندوخته";

    public bool IsConfigured => !string.IsNullOrWhiteSpace(Host) && !string.IsNullOrWhiteSpace(FromAddress);
}
