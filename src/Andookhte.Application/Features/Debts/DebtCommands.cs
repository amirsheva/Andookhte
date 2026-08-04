using Andookhte.Application.Common.Exceptions;
using Andookhte.Application.Common.Interfaces;
using Andookhte.Application.Features.Transactions;
using Andookhte.Domain.Entities.Debts;
using Andookhte.Domain.Entities.Finance;
using Andookhte.Domain.Entities.Workspaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Andookhte.Application.Features.Debts;

/* ————————————————— ایجاد ————————————————— */

/// <summary>
/// هر سه نوع تکرار همین یک مسیر را طی می‌کنند — فقط تعداد قسط تولیدشده فرق دارد.
/// <c>Amount</c> برای یک‌باره کل مبلغ است و برای اقساط/ماهیانه مبلغ هر قسط (که
/// بعداً مستقل قابل ویرایش است).
/// </summary>
public record CreateDebtCommand(
    string Title,
    DebtDirection Direction,
    DebtRecurrenceType RecurrenceType,
    DateTime FirstDueDateUtc,
    decimal Amount,
    int OccurrenceCount = 1,
    string? CounterpartyName = null,
    string? Note = null
) : IRequest<Guid>;

public class CreateDebtCommandHandler : IRequestHandler<CreateDebtCommand, Guid>
{
    private readonly IAppDbContext _context;
    private readonly IWorkspaceContext _workspace;
    private readonly ICurrentUser _currentUser;

    public CreateDebtCommandHandler(IAppDbContext context, IWorkspaceContext workspace, ICurrentUser currentUser)
    {
        _context = context;
        _workspace = workspace;
        _currentUser = currentUser;
    }

    public async Task<Guid> Handle(CreateDebtCommand request, CancellationToken cancellationToken)
    {
        _workspace.RequireRole(WorkspaceRole.Accountant);

        if (string.IsNullOrWhiteSpace(request.Title))
            throw new ValidationException("عنوان را وارد کنید.");
        if (request.Amount <= 0)
            throw new ValidationException("مبلغ باید بزرگ‌تر از صفر باشد.");

        var count = request.RecurrenceType == DebtRecurrenceType.OneTime
            ? 1
            : Math.Clamp(request.OccurrenceCount, 1, 360);

        var workspaceId = _workspace.RequireWorkspaceId();

        var debt = new Debt
        {
            WorkspaceId = workspaceId,
            CreatedByUserId = _currentUser.RequireUserId(),
            Title = request.Title.Trim(),
            Direction = request.Direction,
            RecurrenceType = request.RecurrenceType,
            CounterpartyName = DebtRules.Blank(request.CounterpartyName),
            Note = DebtRules.Blank(request.Note),
        };
        _context.Debts.Add(debt);

        for (var i = 0; i < count; i++)
        {
            _context.DebtInstallments.Add(new DebtInstallment
            {
                WorkspaceId = workspaceId,
                DebtId = debt.Id,
                SequenceNumber = i + 1,
                DueDateUtc = request.FirstDueDateUtc.AddMonths(i),
                Amount = request.Amount,
            });
        }

        await _context.SaveChangesAsync(cancellationToken);
        return debt.Id;
    }
}

/* ————————————————— ویرایش سرفصل ————————————————— */

/// <summary>فقط عنوان و یادداشت؛ مبلغ و تاریخ از طریق قسط‌ها اصلاح می‌شوند.</summary>
public record UpdateDebtCommand(Guid Id, string Title, string? CounterpartyName, string? Note) : IRequest<Unit>;

public class UpdateDebtCommandHandler : IRequestHandler<UpdateDebtCommand, Unit>
{
    private readonly IAppDbContext _context;
    private readonly IWorkspaceContext _workspace;

    public UpdateDebtCommandHandler(IAppDbContext context, IWorkspaceContext workspace)
    {
        _context = context;
        _workspace = workspace;
    }

    public async Task<Unit> Handle(UpdateDebtCommand request, CancellationToken cancellationToken)
    {
        _workspace.RequireRole(WorkspaceRole.Accountant);

        if (string.IsNullOrWhiteSpace(request.Title))
            throw new ValidationException("عنوان را وارد کنید.");

        var debt = await _context.Debts.FirstOrDefaultAsync(d => d.Id == request.Id, cancellationToken)
            ?? throw new NotFoundException("بدهی/طلب یافت نشد.");

        debt.Title = request.Title.Trim();
        debt.CounterpartyName = DebtRules.Blank(request.CounterpartyName);
        debt.Note = DebtRules.Blank(request.Note);

        await _context.SaveChangesAsync(cancellationToken);
        return Unit.Value;
    }
}

/* ————————————————— حذف ————————————————— */

public record DeleteDebtCommand(Guid Id) : IRequest<Unit>;

public class DeleteDebtCommandHandler : IRequestHandler<DeleteDebtCommand, Unit>
{
    private readonly IAppDbContext _context;
    private readonly IWorkspaceContext _workspace;

    public DeleteDebtCommandHandler(IAppDbContext context, IWorkspaceContext workspace)
    {
        _context = context;
        _workspace = workspace;
    }

    public async Task<Unit> Handle(DeleteDebtCommand request, CancellationToken cancellationToken)
    {
        _workspace.RequireRole(WorkspaceRole.Accountant);

        var debt = await _context.Debts
            .Include(d => d.Installments)
            .FirstOrDefaultAsync(d => d.Id == request.Id, cancellationToken)
            ?? throw new NotFoundException("بدهی/طلب یافت نشد.");

        // حذف بدهی‌ای که قسط پرداخت‌شده دارد، تاریخچهٔ مالی را بی‌معنا می‌کند —
        // همان استدلال محافظت حساب دارای تراکنش.
        if (debt.Installments.Any(i => i.Status == InstallmentStatus.Paid))
        {
            throw new ConflictException(
                "این بدهی/طلب قسط پرداخت‌شده دارد و قابل حذف نیست.");
        }

        debt.IsDeleted = true;
        foreach (var installment in debt.Installments)
            installment.IsDeleted = true;

        await _context.SaveChangesAsync(cancellationToken);
        return Unit.Value;
    }
}

/* ————————————————— تمدید (برای ماهیانهٔ باز) ————————————————— */

public record ExtendDebtCommand(Guid DebtId, int AdditionalCount) : IRequest<Unit>;

public class ExtendDebtCommandHandler : IRequestHandler<ExtendDebtCommand, Unit>
{
    private readonly IAppDbContext _context;
    private readonly IWorkspaceContext _workspace;

    public ExtendDebtCommandHandler(IAppDbContext context, IWorkspaceContext workspace)
    {
        _context = context;
        _workspace = workspace;
    }

    public async Task<Unit> Handle(ExtendDebtCommand request, CancellationToken cancellationToken)
    {
        _workspace.RequireRole(WorkspaceRole.Accountant);

        var debt = await _context.Debts
            .Include(d => d.Installments)
            .FirstOrDefaultAsync(d => d.Id == request.DebtId, cancellationToken)
            ?? throw new NotFoundException("بدهی/طلب یافت نشد.");

        if (debt.RecurrenceType == DebtRecurrenceType.OneTime)
            throw new ConflictException("بدهی یک‌باره تمدید نمی‌شود.");

        var last = debt.Installments.OrderByDescending(i => i.SequenceNumber).First();
        var count = Math.Clamp(request.AdditionalCount, 1, 360);
        var workspaceId = _workspace.RequireWorkspaceId();

        for (var i = 1; i <= count; i++)
        {
            _context.DebtInstallments.Add(new DebtInstallment
            {
                WorkspaceId = workspaceId,
                DebtId = debt.Id,
                SequenceNumber = last.SequenceNumber + i,
                DueDateUtc = last.DueDateUtc.AddMonths(i),
                // مبلغ آخرین قسط ادامه پیدا می‌کند — معمولاً همان مبلغ فعلی تکرارشونده است
                Amount = last.Amount,
            });
        }

        await _context.SaveChangesAsync(cancellationToken);
        return Unit.Value;
    }
}

/* ————————————————— اصلاح مبلغ قسط ————————————————— */

public record UpdateInstallmentAmountCommand(Guid InstallmentId, decimal Amount, DateTime? DueDateUtc) : IRequest<Unit>;

public class UpdateInstallmentAmountCommandHandler : IRequestHandler<UpdateInstallmentAmountCommand, Unit>
{
    private readonly IAppDbContext _context;
    private readonly IWorkspaceContext _workspace;

    public UpdateInstallmentAmountCommandHandler(IAppDbContext context, IWorkspaceContext workspace)
    {
        _context = context;
        _workspace = workspace;
    }

    public async Task<Unit> Handle(UpdateInstallmentAmountCommand request, CancellationToken cancellationToken)
    {
        _workspace.RequireRole(WorkspaceRole.Accountant);

        if (request.Amount <= 0)
            throw new ValidationException("مبلغ باید بزرگ‌تر از صفر باشد.");

        var installment = await _context.DebtInstallments
            .FirstOrDefaultAsync(i => i.Id == request.InstallmentId, cancellationToken)
            ?? throw new NotFoundException("قسط یافت نشد.");

        // قسط پرداخت‌شده مرجع یک تراکنش واقعی است؛ اصلاح مبلغش اینجا با آن تراکنش
        // ناهم‌خوان می‌شود. برای اصلاح، خودِ تراکنش را در صفحهٔ تراکنش‌ها ویرایش کنید.
        if (installment.Status == InstallmentStatus.Paid)
            throw new ConflictException("قسط پرداخت‌شده از این مسیر اصلاح نمی‌شود.");

        installment.Amount = request.Amount;
        if (request.DueDateUtc is not null)
            installment.DueDateUtc = request.DueDateUtc.Value;

        await _context.SaveChangesAsync(cancellationToken);
        return Unit.Value;
    }
}

/* ————————————————— ثبت پرداخت ————————————————— */

public record RecordInstallmentPaymentCommand(
    Guid InstallmentId, Guid AccountId, DateTime? PaidAtUtc
) : IRequest<Unit>;

public class RecordInstallmentPaymentCommandHandler : IRequestHandler<RecordInstallmentPaymentCommand, Unit>
{
    private readonly IAppDbContext _context;
    private readonly IWorkspaceContext _workspace;
    private readonly ICurrentUser _currentUser;

    public RecordInstallmentPaymentCommandHandler(
        IAppDbContext context, IWorkspaceContext workspace, ICurrentUser currentUser)
    {
        _context = context;
        _workspace = workspace;
        _currentUser = currentUser;
    }

    public async Task<Unit> Handle(RecordInstallmentPaymentCommand request, CancellationToken cancellationToken)
    {
        _workspace.RequireRole(WorkspaceRole.Accountant);

        var installment = await _context.DebtInstallments
            .Include(i => i.Debt)
            .FirstOrDefaultAsync(i => i.Id == request.InstallmentId, cancellationToken)
            ?? throw new NotFoundException("قسط یافت نشد.");

        if (installment.Status == InstallmentStatus.Paid)
            throw new ConflictException("این قسط قبلاً پرداخت‌شده ثبت شده است.");

        var account = await _context.Accounts
            .FirstOrDefaultAsync(a => a.Id == request.AccountId, cancellationToken)
            ?? throw new NotFoundException("حساب یافت نشد.");

        // بدهی من (Payable) یعنی از حساب برداشت می‌شود؛ طلب من (Receivable) یعنی به حساب واریز می‌شود.
        var type = installment.Debt.Direction == DebtDirection.Payable
            ? TransactionType.Expense
            : TransactionType.Income;

        BalanceEffect.Apply(
            type, installment.Amount,
            source: type == TransactionType.Expense ? account : null,
            destination: type == TransactionType.Income ? account : null);

        var transaction = new Transaction
        {
            WorkspaceId = _workspace.RequireWorkspaceId(),
            CreatedByUserId = _currentUser.RequireUserId(),
            Type = type,
            Amount = installment.Amount,
            SourceAccountId = type == TransactionType.Expense ? account.Id : null,
            DestinationAccountId = type == TransactionType.Income ? account.Id : null,
            Category = "debt",
            Description = $"{installment.Debt.Title} — قسط {installment.SequenceNumber}",
            OccurredAtUtc = request.PaidAtUtc ?? DateTime.UtcNow,
        };
        _context.Transactions.Add(transaction);

        installment.Status = InstallmentStatus.Paid;
        installment.PaidAtUtc = DateTime.UtcNow;
        installment.PaidTransactionId = transaction.Id;

        await _context.SaveChangesAsync(cancellationToken);
        return Unit.Value;
    }
}

/* ————————————————— بازگرداندن به «در انتظار» ————————————————— */

public record RevertInstallmentPaymentCommand(Guid InstallmentId) : IRequest<Unit>;

public class RevertInstallmentPaymentCommandHandler : IRequestHandler<RevertInstallmentPaymentCommand, Unit>
{
    private readonly IAppDbContext _context;
    private readonly IWorkspaceContext _workspace;

    public RevertInstallmentPaymentCommandHandler(IAppDbContext context, IWorkspaceContext workspace)
    {
        _context = context;
        _workspace = workspace;
    }

    public async Task<Unit> Handle(RevertInstallmentPaymentCommand request, CancellationToken cancellationToken)
    {
        _workspace.RequireRole(WorkspaceRole.Accountant);

        var installment = await _context.DebtInstallments
            .FirstOrDefaultAsync(i => i.Id == request.InstallmentId, cancellationToken)
            ?? throw new NotFoundException("قسط یافت نشد.");

        if (installment.Status != InstallmentStatus.Paid)
            throw new ConflictException("این قسط پرداخت‌شده نیست.");

        // عمداً تراکنش مالی مرتبط را دست‌نخورده می‌گذارد — فقط ارجاع را پاک می‌کند تا
        // در صورت نیاز، خودِ تراکنش هم جداگانه از صفحهٔ تراکنش‌ها حذف/ویرایش شود.
        installment.Status = InstallmentStatus.Pending;
        installment.PaidAtUtc = null;
        installment.PaidTransactionId = null;

        await _context.SaveChangesAsync(cancellationToken);
        return Unit.Value;
    }
}

/* ————————————————— قواعد مشترک ————————————————— */

internal static class DebtRules
{
    public static string? Blank(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
