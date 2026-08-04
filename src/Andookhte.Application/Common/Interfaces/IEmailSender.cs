namespace Andookhte.Application.Common.Interfaces;

/// <summary>
/// ارسال ایمیل عمومی — جدا از <see cref="IOtpSender"/> که مخصوص کد یک‌بارمصرف است.
/// برای یادآوری سررسید بدهی/طلب و هر ایمیل غیر-OTP دیگر استفاده می‌شود.
/// </summary>
public interface IEmailSender
{
    Task SendAsync(string toEmail, string subject, string body, CancellationToken cancellationToken = default);
}
