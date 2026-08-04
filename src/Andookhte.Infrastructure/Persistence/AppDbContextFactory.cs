using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Andookhte.Infrastructure.Persistence;

/// <summary>
/// کارخانهٔ زمان طراحی — فقط برای دستورهای `dotnet ef` استفاده می‌شود
/// تا ابزار مهاجرت بتواند بدون بالا آوردن کل برنامه، DbContext بسازد.
///
/// رشتهٔ اتصال از متغیر محیطی <c>ANDOOKHTE_CONNECTION</c> خوانده می‌شود و در نبود آن
/// به دیتابیس محلی docker-compose برمی‌گردد. این مقدار فقط برای تولید فایل مهاجرت
/// به کار می‌رود و به دیتابیس تولید وصل نمی‌شود.
/// </summary>
public class AppDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    private const string LocalDevelopmentConnection =
        "Host=localhost;Port=5432;Database=andookhte;Username=andookhte;Password=andookhte";

    public AppDbContext CreateDbContext(string[] args)
    {
        var connectionString = Environment.GetEnvironmentVariable("ANDOOKHTE_CONNECTION")
                               ?? LocalDevelopmentConnection;

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(connectionString)
            .Options;

        return new AppDbContext(options, new NullWorkspaceContext());
    }
}
