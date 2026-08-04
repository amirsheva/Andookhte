using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Andookhte.Infrastructure.Persistence;

/// <summary>
/// جدول‌های کد یک‌بارمصرف و توکن تمدید فقط رشد می‌کنند و هیچ مسیر کاربری آن‌ها را
/// پاک نمی‌کند. این سرویس رکوردهای منقضی را دوره‌ای حذف می‌کند.
///
/// توکن‌های باطل‌شده تا یک بازهٔ مشخص نگه داشته می‌شوند، نه بلافاصله: تشخیص
/// «استفادهٔ مجدد از توکن دزدیده‌شده» در RefreshTokenCommandHandler به وجود همان
/// رکورد باطل‌شده وابسته است. اگر فوراً پاک شوند، آن دفاع از کار می‌افتد.
/// </summary>
public class ExpiredRecordsCleanupService : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromHours(6);
    private static readonly TimeSpan RevokedTokenRetention = TimeSpan.FromDays(7);
    private static readonly TimeSpan ConsumedOtpRetention = TimeSpan.FromDays(1);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<ExpiredRecordsCleanupService> _logger;

    public ExpiredRecordsCleanupService(
        IServiceScopeFactory scopeFactory, ILogger<ExpiredRecordsCleanupService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // کمی تأخیر اولیه تا با مهاجرت دیتابیس هنگام بالا آمدن تداخل نکند
        try
        {
            await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
        }
        catch (OperationCanceledException)
        {
            return;
        }

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await CleanupAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                return;
            }
            catch (Exception exception)
            {
                // خطای پاک‌سازی نباید سرویس را متوقف کند؛ در دور بعدی دوباره تلاش می‌شود
                _logger.LogError(exception, "پاک‌سازی رکوردهای منقضی با خطا مواجه شد.");
            }

            try
            {
                await Task.Delay(Interval, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                return;
            }
        }
    }

    private async Task CleanupAsync(CancellationToken cancellationToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var now = DateTime.UtcNow;
        var tokenCutoff = now.Subtract(RevokedTokenRetention);
        var otpCutoff = now.Subtract(ConsumedOtpRetention);

        // IgnoreQueryFilters هم لازم است و هم درست: فیلتر RefreshToken به نویگیشن User
        // اشاره می‌کند و ExecuteDelete با زیرکوئری کنار نمی‌آید؛ ضمناً توکن کاربرِ
        // حذف‌شده هم باید پاک شود، نه اینکه از دید پاک‌سازی پنهان بماند.
        var removedTokens = await context.RefreshTokens
            .IgnoreQueryFilters()
            .Where(t => (t.RevokedAtUtc != null && t.RevokedAtUtc < tokenCutoff) || t.ExpiresAtUtc < tokenCutoff)
            .ExecuteDeleteAsync(cancellationToken);

        var removedCodes = await context.OtpCodes
            .IgnoreQueryFilters()
            .Where(o => o.ExpiresAtUtc < otpCutoff ||
                        (o.ConsumedAtUtc != null && o.ConsumedAtUtc < otpCutoff))
            .ExecuteDeleteAsync(cancellationToken);

        if (removedTokens > 0 || removedCodes > 0)
        {
            _logger.LogInformation(
                "پاک‌سازی انجام شد: {Tokens} توکن تمدید و {Codes} کد یک‌بارمصرف حذف شد.",
                removedTokens, removedCodes);
        }
    }
}
