using Andookhte.Application.Common.Interfaces;
using Andookhte.Infrastructure.Persistence;
using Andookhte.Infrastructure.Security;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Andookhte.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructureServices(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection");

        // بررسی با IsNullOrWhiteSpace انجام می‌شود نه ?? — چون کلید موجود با مقدار خالی،
        // رشتهٔ "" برمی‌گرداند نه null، و آن وقت این خطای روشن جایش را به خطای مبهم
        // تجزیهٔ رشتهٔ اتصال در Npgsql می‌داد.
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException(
                "رشتهٔ اتصال ConnectionStrings:DefaultConnection تنظیم نشده است. " +
                "در توسعه از appsettings.Development.json و در تولید از متغیر محیطی " +
                "ConnectionStrings__DefaultConnection استفاده کنید.");
        }

        services.AddDbContext<AppDbContext>(options =>
            options.UseNpgsql(connectionString, npgsql =>
            {
                // قطعی کوتاه شبکه بین اپ و دیتابیس مدیریت‌شده نباید درخواست کاربر را بترکاند
                npgsql.EnableRetryOnFailure(maxRetryCount: 3, maxRetryDelay: TimeSpan.FromSeconds(5), null);
            }));
        services.AddScoped<IAppDbContext>(provider => provider.GetRequiredService<AppDbContext>());

        services.Configure<JwtOptions>(configuration.GetSection(JwtOptions.SectionName));
        services.Configure<SmsOptions>(configuration.GetSection(SmsOptions.SectionName));

        services.AddSingleton<IPasswordHasher, Pbkdf2PasswordHasher>();
        services.AddSingleton<ITokenService, JwtTokenService>();

        // تا وقتی کلید پنل پیامک تنظیم نشده باشد، کد فقط در لاگ نوشته می‌شود.
        // این انتخاب در زمان راه‌اندازی انجام می‌شود تا در محیط توسعه چیزی نیاز به تغییر نداشته باشد.
        var sms = configuration.GetSection(SmsOptions.SectionName).Get<SmsOptions>() ?? new SmsOptions();

        if (sms.IsConfigured)
            services.AddHttpClient<IOtpSender, KavenegarOtpSender>();
        else
            services.AddScoped<IOtpSender, LoggingOtpSender>();

        services.AddHostedService<ExpiredRecordsCleanupService>();

        return services;
    }
}
