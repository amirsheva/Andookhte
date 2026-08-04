using Andookhte.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Andookhte.Application.Features.Transactions;

public record GetTransactionsQuery(
    DateTime? From = null,
    DateTime? To = null,
    int Page = 1,
    int PageSize = 100
) : IRequest<PagedResult<TransactionDto>>;

public class GetTransactionsQueryHandler
    : IRequestHandler<GetTransactionsQuery, PagedResult<TransactionDto>>
{
    private const int MaxPageSize = 500;

    private readonly IAppDbContext _context;

    public GetTransactionsQueryHandler(IAppDbContext context) => _context = context;

    public async Task<PagedResult<TransactionDto>> Handle(
        GetTransactionsQuery request,
        CancellationToken cancellationToken)
    {
        var page = Math.Max(1, request.Page);
        var pageSize = Math.Clamp(request.PageSize, 1, MaxPageSize);

        var query = _context.Transactions.AsQueryable();

        if (request.From is { } from)
            query = query.Where(t => t.OccurredAtUtc >= from);

        if (request.To is { } to)
            query = query.Where(t => t.OccurredAtUtc <= to);

        var total = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderByDescending(t => t.OccurredAtUtc)
            .ThenByDescending(t => t.CreatedAtUtc)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(t => new TransactionDto(
                t.Id, t.Type, t.Amount, t.SourceAccountId, t.DestinationAccountId,
                t.Category, t.Description, t.OccurredAtUtc))
            .ToListAsync(cancellationToken);

        return new PagedResult<TransactionDto>(items, total, page, pageSize);
    }
}
