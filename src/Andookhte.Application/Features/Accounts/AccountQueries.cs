using Andookhte.Application.Common.Interfaces;
using Andookhte.Domain.Entities.Finance;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Andookhte.Application.Features.Accounts;

public record AccountDto(
    Guid Id,
    string Title,
    AccountType Type,
    decimal CurrentBalance,
    string CurrencyCode,
    string? CardNumber,
    string? IBAN,
    string? BankName,
    int TransactionCount
);

/// <summary>
/// نیازی به شناسهٔ کاربر یا فضای کاری در پارامترها نیست؛
/// فیلتر سراسری کوئری در DbContext محدودسازی را تضمین می‌کند.
/// </summary>
public record GetAccountsQuery : IRequest<List<AccountDto>>;

public class GetAccountsQueryHandler : IRequestHandler<GetAccountsQuery, List<AccountDto>>
{
    private readonly IAppDbContext _context;

    public GetAccountsQueryHandler(IAppDbContext context) => _context = context;

    public async Task<List<AccountDto>> Handle(GetAccountsQuery request, CancellationToken cancellationToken)
    {
        var accounts = await _context.Accounts
            .Select(a => new AccountDto(
                a.Id, a.Title, a.Type, a.CurrentBalance, a.CurrencyCode,
                a.CardNumber, a.IBAN, a.BankName,
                _context.Transactions.Count(t =>
                    t.SourceAccountId == a.Id || t.DestinationAccountId == a.Id)))
            .ToListAsync(cancellationToken);

        // مرتب‌سازی در حافظه انجام می‌شود تا مستقل از پروایدر دیتابیس درست بماند.
        // تعداد حساب‌های یک فضای کاری همیشه تک‌رقمی است، بنابراین هزینه‌ای ندارد.
        return accounts.OrderByDescending(a => a.CurrentBalance).ToList();
    }
}
