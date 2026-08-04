using System.Globalization;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;

namespace Andookhte.Api.Controllers;

/// <summary>
/// محدودسازی نرخ روی مسیرهای احراز هویت، افراز‌شده بر اساس IP.
///
/// محدودیت‌های داخل هندلرها روی شماره و حساب کاربری‌اند و کسی را که با شماره‌های
/// مختلف درخواست کد می‌فرستد متوقف نمی‌کنند — که با پنل پیامک واقعی مستقیماً هزینه دارد.
/// این لایه همان شکاف را می‌بندد.
/// </summary>
public static class RateLimitPolicies
{
    public const string Auth = "auth";

    public static IServiceCollection AddAndookhteRateLimiting(this IServiceCollection services)
    {
        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

            options.AddPolicy(Auth, context => RateLimitPartition.GetFixedWindowLimiter(
                partitionKey: ResolveClientKey(context),
                factory: _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = 20,
                    Window = TimeSpan.FromMinutes(1),
                    QueueLimit = 0,
                    QueueProcessingOrder = QueueProcessingOrder.OldestFirst
                }));

            options.OnRejected = async (context, cancellationToken) =>
            {
                context.HttpContext.Response.ContentType = "application/json; charset=utf-8";

                if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
                {
                    context.HttpContext.Response.Headers.RetryAfter =
                        ((int)retryAfter.TotalSeconds).ToString(NumberFormatInfo.InvariantInfo);
                }

                await context.HttpContext.Response.WriteAsync(
                    "{\"status\":429,\"message\":\"درخواست‌های شما بیش از حد مجاز است. کمی بعد دوباره تلاش کنید.\"}",
                    cancellationToken);
            };
        });

        return services;
    }

    /// <summary>
    /// پشت پراکسی معکوس، RemoteIpAddress آدرس پراکسی است نه کاربر.
    /// اگر X-Forwarded-For موجود باشد نخستین مقدارش استفاده می‌شود؛ برای اعتماد کامل
    /// باید ForwardedHeaders در محیط تولید هم پیکربندی شود.
    /// </summary>
    private static string ResolveClientKey(HttpContext context)
    {
        var forwarded = context.Request.Headers["X-Forwarded-For"].ToString();

        if (!string.IsNullOrWhiteSpace(forwarded))
        {
            var first = forwarded.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
                                 .FirstOrDefault();
            if (!string.IsNullOrEmpty(first)) return first;
        }

        return context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    }
}
