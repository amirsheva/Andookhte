using Andookhte.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Andookhte.Application.Features.Debts;

/// <summary>
/// همهٔ بدهی/طلب‌های فضای کاری با قسط‌هایشان — مثل تراکنش‌ها، فیلتر تاریخ و
/// نمای تقویم سمت کلاینت انجام می‌شود؛ تعداد قسط‌ها به‌اندازه‌ای نیست که صفحه‌بندی لازم باشد.
/// </summary>
public record GetDebtsQuery : IRequest<List<DebtDto>>;

public class GetDebtsQueryHandler : IRequestHandler<GetDebtsQuery, List<DebtDto>>
{
    private readonly IAppDbContext _context;

    public GetDebtsQueryHandler(IAppDbContext context)
    {
        _context = context;
    }

    public async Task<List<DebtDto>> Handle(GetDebtsQuery request, CancellationToken cancellationToken)
    {
        var debts = await _context.Debts
            .Include(d => d.Installments.OrderBy(i => i.SequenceNumber))
            .OrderByDescending(d => d.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        return debts.Select(d => new DebtDto(
            d.Id,
            d.Title,
            d.Direction,
            d.RecurrenceType,
            d.CounterpartyName,
            d.Note,
            d.Installments.Select(i => new InstallmentDto(
                i.Id, i.SequenceNumber, i.DueDateUtc, i.Amount, i.Status, i.PaidAtUtc, i.PaidTransactionId
            )).ToList()
        )).ToList();
    }
}
