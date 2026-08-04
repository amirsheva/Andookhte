using Andookhte.Domain.Entities.Finance;

namespace Andookhte.Application.Features.Transactions;

public record TransactionDto(
    Guid Id,
    TransactionType Type,
    decimal Amount,
    Guid? SourceAccountId,
    Guid? DestinationAccountId,
    string? Category,
    string? Description,
    DateTime OccurredAtUtc
);

/// <summary>
/// پاسخ صفحه‌بندی‌شده. <c>Total</c> شمار کل ردیف‌های منطبق با فیلتر است، نه اندازهٔ صفحه —
/// کلاینت با آن می‌فهمد داده‌ای باقی مانده یا نه.
/// </summary>
public record PagedResult<T>(
    IReadOnlyList<T> Items,
    int Total,
    int Page,
    int PageSize
)
{
    public bool HasMore => Page * PageSize < Total;
}
