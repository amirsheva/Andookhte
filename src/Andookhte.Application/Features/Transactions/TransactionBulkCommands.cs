using Andookhte.Application.Common.Exceptions;
using Andookhte.Application.Common.Interfaces;
using Andookhte.Domain.Entities.Finance;
using Andookhte.Domain.Entities.Workspaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Andookhte.Application.Features.Transactions;

/* ————————————————— خروجی اکسل ————————————————— */

public record ExportTransactionsQuery(DateTime? From = null, DateTime? To = null) : IRequest<byte[]>;

public class ExportTransactionsQueryHandler : IRequestHandler<ExportTransactionsQuery, byte[]>
{
    private readonly IAppDbContext _context;
    private readonly ITransactionWorkbookService _workbook;

    public ExportTransactionsQueryHandler(IAppDbContext context, ITransactionWorkbookService workbook)
    {
        _context = context;
        _workbook = workbook;
    }

    public async Task<byte[]> Handle(ExportTransactionsQuery request, CancellationToken cancellationToken)
    {
        var query = _context.Transactions.AsQueryable();
        if (request.From is { } from) query = query.Where(t => t.OccurredAtUtc >= from);
        if (request.To is { } to) query = query.Where(t => t.OccurredAtUtc <= to);

        var rows = await query
            .OrderBy(t => t.OccurredAtUtc)
            .Select(t => new TransactionExportRow(
                t.OccurredAtUtc,
                t.Type,
                t.Amount,
                t.SourceAccount != null ? t.SourceAccount.Title : null,
                t.DestinationAccount != null ? t.DestinationAccount.Title : null,
                t.Category,
                t.Description))
            .ToListAsync(cancellationToken);

        return _workbook.Export(rows);
    }
}

/* ————————————————— ورودی اکسل ————————————————— */

public record ImportedRowResult(int RowNumber, bool Succeeded, string? Error);

public record ImportTransactionsResult(int SucceededCount, int FailedCount, List<ImportedRowResult> Rows);

public record ImportTransactionsCommand(byte[] FileContent) : IRequest<ImportTransactionsResult>;

public class ImportTransactionsCommandHandler
    : IRequestHandler<ImportTransactionsCommand, ImportTransactionsResult>
{
    private readonly IAppDbContext _context;
    private readonly IWorkspaceContext _workspace;
    private readonly ICurrentUser _currentUser;
    private readonly ITransactionWorkbookService _workbook;

    public ImportTransactionsCommandHandler(
        IAppDbContext context, IWorkspaceContext workspace, ICurrentUser currentUser,
        ITransactionWorkbookService workbook)
    {
        _context = context;
        _workspace = workspace;
        _currentUser = currentUser;
        _workbook = workbook;
    }

    public async Task<ImportTransactionsResult> Handle(
        ImportTransactionsCommand request, CancellationToken cancellationToken)
    {
        _workspace.RequireRole(WorkspaceRole.Accountant);
        var workspaceId = _workspace.RequireWorkspaceId();
        var userId = _currentUser.RequireUserId();

        List<TransactionImportRow> rawRows;
        try
        {
            using var stream = new MemoryStream(request.FileContent);
            rawRows = _workbook.Parse(stream).ToList();
        }
        catch (Exception)
        {
            throw new ValidationException(
                "فایل قابل خواندن نیست. مطمئن شوید فرمت xlsx است و همان قالب خروجی اکسل رعایت شده.");
        }

        if (rawRows.Count == 0)
            throw new ValidationException("فایل ردیفی برای ورود ندارد.");

        // برای اینکه چند ردیف روی یک حساب، اثرشان روی موجودی تجمیع شود، همه از یک
        // نمونهٔ ردیابی‌شده استفاده می‌کنند — نه یک کوئری جدا به ازای هر ردیف.
        var accountsByTitle = (await _context.Accounts.ToListAsync(cancellationToken))
            .GroupBy(a => a.Title.Trim().ToLowerInvariant())
            .ToDictionary(g => g.Key, g => g.First());

        var results = new List<ImportedRowResult>();

        foreach (var raw in rawRows)
        {
            try
            {
                var type = ParseType(raw.TypeRaw)
                    ?? throw new ValidationException(
                        $"نوع «{raw.TypeRaw}» شناخته‌شده نیست — باید «هزینه»، «درآمد» یا «انتقال» باشد.");

                if (raw.OccurredAtUtc is not { } occurredAt)
                    throw new ValidationException("تاریخ نامعتبر یا خالی است.");

                if (raw.Amount is not { } amount)
                    throw new ValidationException("مبلغ نامعتبر یا خالی است.");

                var source = ResolveAccount(raw.SourceAccountTitle, accountsByTitle, "مبدأ");
                var destination = ResolveAccount(raw.DestinationAccountTitle, accountsByTitle, "مقصد");

                TransactionRules.Validate(type, amount, source, destination);
                BalanceEffect.Apply(type, amount, source, destination);

                _context.Transactions.Add(new Transaction
                {
                    WorkspaceId = workspaceId,
                    CreatedByUserId = userId,
                    Type = type,
                    Amount = amount,
                    SourceAccountId = source?.Id,
                    DestinationAccountId = destination?.Id,
                    Category = TransactionRules.Blank(raw.Category),
                    Description = TransactionRules.Blank(raw.Description),
                    OccurredAtUtc = occurredAt
                });

                results.Add(new ImportedRowResult(raw.RowNumber, true, null));
            }
            catch (AppException ex)
            {
                results.Add(new ImportedRowResult(raw.RowNumber, false, ex.Message));
            }
        }

        if (results.Any(r => r.Succeeded))
            await _context.SaveChangesAsync(cancellationToken);

        return new ImportTransactionsResult(
            results.Count(r => r.Succeeded), results.Count(r => !r.Succeeded), results);
    }

    private static Account? ResolveAccount(string? title, Dictionary<string, Account> byTitle, string label)
    {
        if (string.IsNullOrWhiteSpace(title)) return null;

        return byTitle.TryGetValue(title.Trim().ToLowerInvariant(), out var account)
            ? account
            : throw new ValidationException($"حساب {label} «{title}» پیدا نشد.");
    }

    private static TransactionType? ParseType(string? raw)
    {
        var value = raw?.Trim().ToLowerInvariant();
        return value switch
        {
            "درآمد" or "income" or "1" => TransactionType.Income,
            "هزینه" or "expense" or "2" => TransactionType.Expense,
            "انتقال" or "transfer" or "3" => TransactionType.Transfer,
            _ => null
        };
    }
}

/* ————————————————— حذف دسته‌جمعی ————————————————— */

public record BulkDeleteRowResult(Guid Id, bool Succeeded, string? Error);

public record BulkDeleteResult(int SucceededCount, int FailedCount, List<BulkDeleteRowResult> Rows);

public record BulkDeleteTransactionsCommand(List<Guid> Ids) : IRequest<BulkDeleteResult>;

public class BulkDeleteTransactionsCommandHandler
    : IRequestHandler<BulkDeleteTransactionsCommand, BulkDeleteResult>
{
    private readonly IAppDbContext _context;
    private readonly IWorkspaceContext _workspace;

    public BulkDeleteTransactionsCommandHandler(IAppDbContext context, IWorkspaceContext workspace)
    {
        _context = context;
        _workspace = workspace;
    }

    public async Task<BulkDeleteResult> Handle(
        BulkDeleteTransactionsCommand request, CancellationToken cancellationToken)
    {
        _workspace.RequireRole(WorkspaceRole.Accountant);

        var results = new List<BulkDeleteRowResult>();
        var anyDeleted = false;

        foreach (var id in request.Ids.Distinct())
        {
            try
            {
                var transaction = await _context.Transactions
                    .FirstOrDefaultAsync(t => t.Id == id, cancellationToken)
                    ?? throw new NotFoundException("تراکنش یافت نشد.");

                var linkedInstallment = await _context.DebtInstallments
                    .AnyAsync(i => i.PaidTransactionId == transaction.Id, cancellationToken);
                if (linkedInstallment)
                {
                    throw new ConflictException(
                        "این تراکنش پرداخت یک قسط بدهی/طلب است — ابتدا آن قسط را به «در انتظار» برگردانید.");
                }

                var source = await TransactionRules.FindAccountAsync(
                    _context, transaction.SourceAccountId, "مبدأ", cancellationToken);
                var destination = await TransactionRules.FindAccountAsync(
                    _context, transaction.DestinationAccountId, "مقصد", cancellationToken);

                BalanceEffect.Revert(transaction.Type, transaction.Amount, source, destination);
                transaction.IsDeleted = true;

                results.Add(new BulkDeleteRowResult(id, true, null));
                anyDeleted = true;
            }
            catch (AppException ex)
            {
                results.Add(new BulkDeleteRowResult(id, false, ex.Message));
            }
        }

        if (anyDeleted)
            await _context.SaveChangesAsync(cancellationToken);

        return new BulkDeleteResult(
            results.Count(r => r.Succeeded), results.Count(r => !r.Succeeded), results);
    }
}
