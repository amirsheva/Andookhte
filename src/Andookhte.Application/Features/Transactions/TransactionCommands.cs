using Andookhte.Application.Common.Exceptions;
using Andookhte.Application.Common.Interfaces;
using Andookhte.Domain.Entities.Finance;
using Andookhte.Domain.Entities.Workspaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Andookhte.Application.Features.Transactions;

/* ————————————————— ثبت ————————————————— */

public record CreateTransactionCommand(
    TransactionType Type,
    decimal Amount,
    Guid? SourceAccountId = null,
    Guid? DestinationAccountId = null,
    string? Category = null,
    string? Description = null,
    DateTime? OccurredAtUtc = null
) : IRequest<Guid>;

public class CreateTransactionCommandHandler : IRequestHandler<CreateTransactionCommand, Guid>
{
    private readonly IAppDbContext _context;
    private readonly IWorkspaceContext _workspace;
    private readonly ICurrentUser _currentUser;

    public CreateTransactionCommandHandler(
        IAppDbContext context, IWorkspaceContext workspace, ICurrentUser currentUser)
    {
        _context = context;
        _workspace = workspace;
        _currentUser = currentUser;
    }

    public async Task<Guid> Handle(CreateTransactionCommand request, CancellationToken cancellationToken)
    {
        _workspace.RequireRole(WorkspaceRole.Accountant);

        // حساب‌ها از طریق فیلتر سراسری فقط در همین فضای کاری جست‌وجو می‌شوند،
        // بنابراین ارجاع به حساب فضای کاری دیگر خودبه‌خود «یافت نشد» می‌دهد.
        var source = await TransactionRules.FindAccountAsync(
            _context, request.SourceAccountId, "مبدأ", cancellationToken);
        var destination = await TransactionRules.FindAccountAsync(
            _context, request.DestinationAccountId, "مقصد", cancellationToken);

        TransactionRules.Validate(request.Type, request.Amount, source, destination);
        BalanceEffect.Apply(request.Type, request.Amount, source, destination);

        var transaction = new Transaction
        {
            WorkspaceId = _workspace.RequireWorkspaceId(),
            CreatedByUserId = _currentUser.RequireUserId(),
            Type = request.Type,
            Amount = request.Amount,
            SourceAccountId = source?.Id,
            DestinationAccountId = destination?.Id,
            Category = TransactionRules.Blank(request.Category),
            Description = TransactionRules.Blank(request.Description),
            OccurredAtUtc = request.OccurredAtUtc ?? DateTime.UtcNow
        };

        _context.Transactions.Add(transaction);
        await _context.SaveChangesAsync(cancellationToken);

        return transaction.Id;
    }
}

/* ————————————————— ویرایش ————————————————— */

public record UpdateTransactionCommand(
    Guid Id,
    TransactionType Type,
    decimal Amount,
    Guid? SourceAccountId = null,
    Guid? DestinationAccountId = null,
    string? Category = null,
    string? Description = null,
    DateTime? OccurredAtUtc = null
) : IRequest<Unit>;

public class UpdateTransactionCommandHandler : IRequestHandler<UpdateTransactionCommand, Unit>
{
    private readonly IAppDbContext _context;
    private readonly IWorkspaceContext _workspace;

    public UpdateTransactionCommandHandler(IAppDbContext context, IWorkspaceContext workspace)
    {
        _context = context;
        _workspace = workspace;
    }

    public async Task<Unit> Handle(UpdateTransactionCommand request, CancellationToken cancellationToken)
    {
        _workspace.RequireRole(WorkspaceRole.Accountant);

        var transaction = await _context.Transactions
            .FirstOrDefaultAsync(t => t.Id == request.Id, cancellationToken)
            ?? throw new NotFoundException("تراکنش یافت نشد.");

        // حساب‌های قدیم و جدید ممکن است متفاوت باشند، پس هر دو مجموعه لازم است.
        var oldSource = await TransactionRules.FindAccountAsync(
            _context, transaction.SourceAccountId, "مبدأ", cancellationToken);
        var oldDestination = await TransactionRules.FindAccountAsync(
            _context, transaction.DestinationAccountId, "مقصد", cancellationToken);

        var newSource = await TransactionRules.FindAccountAsync(
            _context, request.SourceAccountId, "مبدأ", cancellationToken);
        var newDestination = await TransactionRules.FindAccountAsync(
            _context, request.DestinationAccountId, "مقصد", cancellationToken);

        TransactionRules.Validate(request.Type, request.Amount, newSource, newDestination);

        // اول اثر قدیمی با مقادیر قدیمی برگردانده می‌شود، بعد اثر جدید اعمال.
        // ترتیب مهم است: اگر برعکس بود و حساب‌ها یکی بودند، نتیجه غلط در می‌آمد.
        BalanceEffect.Revert(transaction.Type, transaction.Amount, oldSource, oldDestination);
        BalanceEffect.Apply(request.Type, request.Amount, newSource, newDestination);

        transaction.Type = request.Type;
        transaction.Amount = request.Amount;
        transaction.SourceAccountId = newSource?.Id;
        transaction.DestinationAccountId = newDestination?.Id;
        transaction.Category = TransactionRules.Blank(request.Category);
        transaction.Description = TransactionRules.Blank(request.Description);
        transaction.OccurredAtUtc = request.OccurredAtUtc ?? transaction.OccurredAtUtc;

        await _context.SaveChangesAsync(cancellationToken);

        return Unit.Value;
    }
}

/* ————————————————— حذف ————————————————— */

public record DeleteTransactionCommand(Guid Id) : IRequest<Unit>;

public class DeleteTransactionCommandHandler : IRequestHandler<DeleteTransactionCommand, Unit>
{
    private readonly IAppDbContext _context;
    private readonly IWorkspaceContext _workspace;

    public DeleteTransactionCommandHandler(IAppDbContext context, IWorkspaceContext workspace)
    {
        _context = context;
        _workspace = workspace;
    }

    public async Task<Unit> Handle(DeleteTransactionCommand request, CancellationToken cancellationToken)
    {
        _workspace.RequireRole(WorkspaceRole.Accountant);

        var transaction = await _context.Transactions
            .FirstOrDefaultAsync(t => t.Id == request.Id, cancellationToken)
            ?? throw new NotFoundException("تراکنش یافت نشد.");

        // حذف تراکنشی که پرداخت یک قسط بدهی/طلب است، آن قسط را با ارجاعی یتیم
        // «پرداخت‌شده» نگه می‌دارد. به‌جای حذف آبشاری، تصمیم به کاربر واگذار می‌شود
        // (همان الگوی محافظت حساب دارای تراکنش).
        var linkedInstallment = await _context.DebtInstallments
            .AnyAsync(i => i.PaidTransactionId == transaction.Id, cancellationToken);
        if (linkedInstallment)
        {
            throw new ConflictException(
                "این تراکنش پرداخت یک قسط بدهی/طلب است و قابل حذف نیست. " +
                "ابتدا آن قسط را به‌جای «پرداخت‌شده» به «در انتظار» برگردانید.");
        }

        var source = await TransactionRules.FindAccountAsync(
            _context, transaction.SourceAccountId, "مبدأ", cancellationToken);
        var destination = await TransactionRules.FindAccountAsync(
            _context, transaction.DestinationAccountId, "مقصد", cancellationToken);

        // حذف نرم است، ولی اثر مالی باید واقعاً برگردد؛ وگرنه مجموع موجودی
        // با مجموع تراکنش‌های قابل مشاهده نمی‌خواند.
        BalanceEffect.Revert(transaction.Type, transaction.Amount, source, destination);

        transaction.IsDeleted = true;
        await _context.SaveChangesAsync(cancellationToken);

        return Unit.Value;
    }
}

/* ————————————————— قواعد مشترک ————————————————— */

internal static class TransactionRules
{
    public static void Validate(
        TransactionType type, decimal amount, Account? source, Account? destination)
    {
        if (amount <= 0)
            throw new ValidationException("مبلغ تراکنش باید بزرگ‌تر از صفر باشد.");

        switch (type)
        {
            case TransactionType.Expense:
                if (source is null)
                    throw new ValidationException("برای ثبت هزینه، حساب مبدأ لازم است.");
                break;

            case TransactionType.Income:
                if (destination is null)
                    throw new ValidationException("برای ثبت درآمد، حساب مقصد لازم است.");
                break;

            case TransactionType.Transfer:
                if (source is null || destination is null)
                    throw new ValidationException("برای انتقال، هر دو حساب مبدأ و مقصد لازم است.");
                if (source.Id == destination.Id)
                    throw new ValidationException("حساب مبدأ و مقصد نباید یکسان باشند.");
                break;

            default:
                throw new ValidationException("نوع تراکنش نامعتبر است.");
        }
    }

    public static async Task<Account?> FindAccountAsync(
        IAppDbContext context, Guid? id, string label, CancellationToken cancellationToken)
    {
        if (id is null) return null;

        return await context.Accounts.FirstOrDefaultAsync(a => a.Id == id.Value, cancellationToken)
            ?? throw new NotFoundException($"حساب {label} یافت نشد.");
    }

    public static string? Blank(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
