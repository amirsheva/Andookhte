using Andookhte.Domain.Entities.Debts;

namespace Andookhte.Application.Features.Debts;

public record InstallmentDto(
    Guid Id,
    int SequenceNumber,
    DateTime DueDateUtc,
    decimal Amount,
    InstallmentStatus Status,
    DateTime? PaidAtUtc,
    Guid? PaidTransactionId
);

public record DebtDto(
    Guid Id,
    string Title,
    DebtDirection Direction,
    DebtRecurrenceType RecurrenceType,
    string? CounterpartyName,
    string? Note,
    List<InstallmentDto> Installments
);
