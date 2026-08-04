using Andookhte.Application.Common.Interfaces;
using Andookhte.Domain.Entities.Debts;
using Andookhte.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Andookhte.Infrastructure.Debts;

/// <summary>
/// یک ایمیل یادآوری برای هر قسط، سه روز پیش از سررسید (یا فوراً اگر با فاصلهٔ
/// کمتر از سه روز ساخته شده). دقیقاً یک بار در طول عمر قسط ارسال می‌شود —
/// <see cref="DebtInstallment.ReminderSentAtUtc"/> از تکرار جلوگیری می‌کند.
///
/// این سرویس بدون کانتکست درخواست اجرا می‌شود، پس <c>IWorkspaceContext</c> مقداری
/// ندارد و فیلتر سراسری کوئری هیچ ردیفی برنمی‌گرداند؛ به همین دلیل عمداً
/// <c>IgnoreQueryFilters</c> به‌کار رفته و بخش نرم‌حذف فیلتر دستی تکرار شده است.
/// </summary>
public class DebtReminderService : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromHours(12);
    private static readonly TimeSpan ReminderWindow = TimeSpan.FromDays(3);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<DebtReminderService> _logger;

    public DebtReminderService(IServiceScopeFactory scopeFactory, ILogger<DebtReminderService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
        }
        catch (OperationCanceledException)
        {
            return;
        }

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await SendRemindersAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                return;
            }
            catch (Exception exception)
            {
                _logger.LogError(exception, "ارسال یادآوری سررسید با خطا مواجه شد.");
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

    private async Task SendRemindersAsync(CancellationToken cancellationToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var emailSender = scope.ServiceProvider.GetRequiredService<IEmailSender>();

        var now = DateTime.UtcNow;
        var horizon = now.Add(ReminderWindow);

        var due = await context.DebtInstallments
            .IgnoreQueryFilters()
            .Include(i => i.Debt)
            .Where(i => !i.IsDeleted && !i.Debt.IsDeleted
                        && i.Status == InstallmentStatus.Pending
                        && i.ReminderSentAtUtc == null
                        && i.DueDateUtc <= horizon)
            .ToListAsync(cancellationToken);

        if (due.Count == 0) return;

        var userIds = due.Select(i => i.Debt.CreatedByUserId).Distinct().ToList();
        var users = await context.Users
            .Where(u => userIds.Contains(u.Id) && u.Email != null)
            .ToDictionaryAsync(u => u.Id, cancellationToken);

        var sent = 0;
        foreach (var installment in due)
        {
            if (!users.TryGetValue(installment.Debt.CreatedByUserId, out var user))
                continue;

            var direction = installment.Debt.Direction == DebtDirection.Payable ? "پرداخت" : "دریافت";
            var subject = $"یادآوری سررسید — {installment.Debt.Title}";
            var body =
                $"سررسید {direction} «{installment.Debt.Title}» (قسط {installment.SequenceNumber}) " +
                $"به مبلغ {installment.Amount:N0} در تاریخ {installment.DueDateUtc:yyyy-MM-dd} است.";

            await emailSender.SendAsync(user.Email!, subject, body, cancellationToken);
            installment.ReminderSentAtUtc = now;
            sent++;
        }

        if (sent > 0)
        {
            await context.SaveChangesAsync(cancellationToken);
            _logger.LogInformation("{Count} ایمیل یادآوری سررسید ارسال شد.", sent);
        }
    }
}
