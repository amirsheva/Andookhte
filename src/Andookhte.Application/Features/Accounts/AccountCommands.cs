using Andookhte.Application.Common.Exceptions;
using Andookhte.Application.Common.Interfaces;
using Andookhte.Domain.Entities.Finance;
using Andookhte.Domain.Entities.Workspaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Andookhte.Application.Features.Accounts;

/* ————————————————— ایجاد ————————————————— */

public record CreateAccountCommand(
    string Title,
    AccountType Type,
    decimal InitialBalance,
    string CurrencyCode = "IRR",
    string? CardNumber = null,
    string? IBAN = null,
    string? BankName = null
) : IRequest<Guid>;

public class CreateAccountCommandHandler : IRequestHandler<CreateAccountCommand, Guid>
{
    private readonly IAppDbContext _context;
    private readonly IWorkspaceContext _workspace;
    private readonly ICurrentUser _currentUser;

    public CreateAccountCommandHandler(
        IAppDbContext context, IWorkspaceContext workspace, ICurrentUser currentUser)
    {
        _context = context;
        _workspace = workspace;
        _currentUser = currentUser;
    }

    public async Task<Guid> Handle(CreateAccountCommand request, CancellationToken cancellationToken)
    {
        _workspace.RequireRole(WorkspaceRole.Accountant);

        if (string.IsNullOrWhiteSpace(request.Title))
            throw new ValidationException("عنوان حساب را وارد کنید.");

        var account = new Account
        {
            WorkspaceId = _workspace.RequireWorkspaceId(),
            CreatedByUserId = _currentUser.RequireUserId(),
            Title = request.Title.Trim(),
            Type = request.Type,
            InitialBalance = request.InitialBalance,
            CurrentBalance = request.InitialBalance,
            CurrencyCode = AccountRules.Currency(request.CurrencyCode),
            CardNumber = AccountRules.Blank(request.CardNumber),
            IBAN = AccountRules.Blank(request.IBAN),
            BankName = AccountRules.Blank(request.BankName)
        };

        _context.Accounts.Add(account);
        await _context.SaveChangesAsync(cancellationToken);

        return account.Id;
    }
}

/* ————————————————— ویرایش ————————————————— */

/// <summary>
/// موجودی از این مسیر تغییر نمی‌کند. موجودی حاصل تراکنش‌هاست و ویرایش دستی آن
/// باعث می‌شود مجموع تراکنش‌ها با موجودی نخواند. برای اصلاح، تراکنش ثبت یا ویرایش کنید.
/// </summary>
public record UpdateAccountCommand(
    Guid Id,
    string Title,
    AccountType Type,
    string CurrencyCode = "IRR",
    string? CardNumber = null,
    string? IBAN = null,
    string? BankName = null
) : IRequest<Unit>;

public class UpdateAccountCommandHandler : IRequestHandler<UpdateAccountCommand, Unit>
{
    private readonly IAppDbContext _context;
    private readonly IWorkspaceContext _workspace;

    public UpdateAccountCommandHandler(IAppDbContext context, IWorkspaceContext workspace)
    {
        _context = context;
        _workspace = workspace;
    }

    public async Task<Unit> Handle(UpdateAccountCommand request, CancellationToken cancellationToken)
    {
        _workspace.RequireRole(WorkspaceRole.Accountant);

        if (string.IsNullOrWhiteSpace(request.Title))
            throw new ValidationException("عنوان حساب را وارد کنید.");

        var account = await _context.Accounts
            .FirstOrDefaultAsync(a => a.Id == request.Id, cancellationToken)
            ?? throw new NotFoundException("حساب یافت نشد.");

        account.Title = request.Title.Trim();
        account.Type = request.Type;
        account.CurrencyCode = AccountRules.Currency(request.CurrencyCode);
        account.CardNumber = AccountRules.Blank(request.CardNumber);
        account.IBAN = AccountRules.Blank(request.IBAN);
        account.BankName = AccountRules.Blank(request.BankName);

        await _context.SaveChangesAsync(cancellationToken);

        return Unit.Value;
    }
}

/* ————————————————— حذف ————————————————— */

public record DeleteAccountCommand(Guid Id) : IRequest<Unit>;

public class DeleteAccountCommandHandler : IRequestHandler<DeleteAccountCommand, Unit>
{
    private readonly IAppDbContext _context;
    private readonly IWorkspaceContext _workspace;

    public DeleteAccountCommandHandler(IAppDbContext context, IWorkspaceContext workspace)
    {
        _context = context;
        _workspace = workspace;
    }

    public async Task<Unit> Handle(DeleteAccountCommand request, CancellationToken cancellationToken)
    {
        _workspace.RequireRole(WorkspaceRole.Accountant);

        var account = await _context.Accounts
            .FirstOrDefaultAsync(a => a.Id == request.Id, cancellationToken)
            ?? throw new NotFoundException("حساب یافت نشد.");

        // حذف حسابی که تراکنش دارد، تاریخچهٔ مالی را بی‌معنا می‌کند: تراکنش‌ها به حسابی
        // اشاره می‌کنند که دیگر نیست و گزارش‌ها ناقص می‌شوند. به‌جای حذف آبشاری خطرناک،
        // جلوی عملیات گرفته می‌شود و تصمیم به کاربر واگذار می‌شود.
        var usageCount = await _context.Transactions
            .CountAsync(t => t.SourceAccountId == account.Id || t.DestinationAccountId == account.Id,
                cancellationToken);

        if (usageCount > 0)
        {
            throw new ConflictException(
                $"این حساب در {usageCount} تراکنش استفاده شده و قابل حذف نیست. " +
                "ابتدا آن تراکنش‌ها را حذف یا به حساب دیگری منتقل کنید.");
        }

        account.IsDeleted = true;
        await _context.SaveChangesAsync(cancellationToken);

        return Unit.Value;
    }
}

/* ————————————————— قواعد مشترک ————————————————— */

internal static class AccountRules
{
    public static string Currency(string? value)
        => string.IsNullOrWhiteSpace(value) ? "IRR" : value.Trim().ToUpperInvariant();

    public static string? Blank(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
